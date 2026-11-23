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

describe('admin password sign-in', () => {
  const env = { ADMIN_PASSWORD: 'correct horse battery', BOOTSTRAP_ADMIN_EMAIL: 'boss@muzmesh.test' };
  it('is off unless a long enough password and the admin email are set', async () => {
    expect(auth.adminPasswordEnabled({})).toBe(false);
    expect(auth.adminPasswordEnabled({ ADMIN_PASSWORD: 'short', BOOTSTRAP_ADMIN_EMAIL: 'boss@muzmesh.test' })).toBe(false);
    expect(auth.adminPasswordEnabled({ ADMIN_PASSWORD: 'correct horse battery' })).toBe(false);
    expect(auth.adminPasswordEnabled(env)).toBe(true);
    expect(await auth.passwordLogin(makeDb(), 'boss@muzmesh.test', 'short', { ...env, ADMIN_PASSWORD: 'short' })).toBeNull();
  });
  it('creates the first staff account and a working session', async () => {
    const empty = makeDb();
    const s = await auth.passwordLogin(empty, 'Boss@MuzMesh.test', 'correct horse battery', env);
    expect(s?.user.is_staff).toBe(1);
    expect((await auth.userForSession(empty, s!.sessionId))?.email).toBe('boss@muzmesh.test');
    const again = await auth.passwordLogin(empty, 'boss@muzmesh.test', 'correct horse battery', env);
    expect(again?.user.id).toBe(s!.user.id);
    expect(await repo.countUsers(empty)).toBe(1);
  });
  it('rejects a wrong password, any other email, and a non-staff admin address', async () => {
    const empty = makeDb();
    expect(await auth.passwordLogin(empty, 'boss@muzmesh.test', 'wrong password here', env)).toBeNull();
    expect(await auth.passwordLogin(empty, 'owner@acme.test', 'correct horse battery', env)).toBeNull();
    expect(await repo.countUsers(empty)).toBe(0);
    // A client account that happens to use the admin address never gets in by password.
    expect(await auth.passwordLogin(w.db, 'owner@acme.test', 'correct horse battery', { ...env, BOOTSTRAP_ADMIN_EMAIL: 'owner@acme.test' })).toBeNull();
    // Once other users exist, an unknown admin address is not created.
    expect(await auth.passwordLogin(w.db, 'boss@muzmesh.test', 'correct horse battery', env)).toBeNull();
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
