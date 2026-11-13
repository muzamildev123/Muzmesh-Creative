import { beforeEach, describe, expect, it } from 'vitest';
import * as auth from '../src/lib/auth';
import { allow } from '../src/lib/ratelimit';
import * as repo from '../src/lib/repo';
import { makeDb, makeWorld, type World } from './helpers';

let w: World;
beforeEach(async () => { w = await makeWorld(); });

describe('sign-in links', () => {
  it('work once, then never again', async () => {
    const token = await auth.createLoginToken(w.db, w.owner.id);
    expect(await auth.loginTokenIsLive(w.db, token)).toBe(true);
    const s = await auth.consumeLoginToken(w.db, token);
    expect(s?.user.email).toBe('owner@acme.test');
    expect(await auth.consumeLoginToken(w.db, token)).toBeNull();
    expect(await auth.loginTokenIsLive(w.db, token)).toBe(false);
    expect((await auth.userForSession(w.db, s!.sessionId))?.id).toBe(w.owner.id);
    await auth.endSession(w.db, s!.sessionId);
    expect(await auth.userForSession(w.db, s!.sessionId)).toBeNull();
  });
  it('expire, and wrong tokens fail', async () => {
    const token = await auth.createLoginToken(w.db, w.owner.id);
    await w.db.prepare("UPDATE login_tokens SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    expect(await auth.consumeLoginToken(w.db, token)).toBeNull();
    expect(await auth.consumeLoginToken(w.db, 'nope')).toBeNull();
    expect(await auth.userForSession(w.db, 'nope')).toBeNull();
  });
  it('store only hashes', async () => {
    const token = await auth.createLoginToken(w.db, w.owner.id);
    const s = await auth.consumeLoginToken(w.db, token);
    const dump = JSON.stringify([
      (await w.db.prepare('SELECT * FROM login_tokens').all()).results,
      (await w.db.prepare('SELECT * FROM sessions').all()).results,
    ]);
    expect(dump).not.toContain(token);
    expect(dump).not.toContain(s!.sessionId);
  });
  it('are invite-only, except the first staff account on an empty database', async () => {
    expect(await auth.userForLogin(w.db, 'stranger@evil.test', 'stranger@evil.test')).toBeNull();
    expect((await auth.userForLogin(w.db, 'OWNER@acme.test', undefined))?.id).toBe(w.owner.id);
    const empty = makeDb();
    expect(await auth.userForLogin(empty, 'someone@else.test', 'boss@muzmesh.test')).toBeNull();
    const boss = await auth.userForLogin(empty, 'Boss@MuzMesh.test', 'boss@muzmesh.test');
    expect(boss?.is_staff).toBe(1);
    expect(await repo.countUsers(empty)).toBe(1);
  });
  it('only allow same-site redirects after login', () => {
    expect(auth.safeNext('/w/acme/posts?x=1')).toBe('/w/acme/posts?x=1');
    for (const bad of ['//evil.test', 'https://evil.test', '/\\evil.test', 'javascript:alert(1)', undefined]) expect(auth.safeNext(bad)).toBe('/');
  });
});

describe('rate limit', () => {
  it('allows up to the limit in a window', async () => {
    const r = [];
    for (let i = 0; i < 4; i++) r.push(await allow(w.db, 'k', 3, 600));
    expect(r).toEqual([true, true, true, false]);
    expect(await allow(w.db, 'other', 3, 600)).toBe(true);
  });
});
