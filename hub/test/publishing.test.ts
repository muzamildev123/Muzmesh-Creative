// Automatic posting, accounts, short links, the assets library and time zones.
// LinkedIn and X are replaced by a fake fetch; nothing here reaches the internet.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addAsset, deleteAsset } from '../src/lib/assets';
import { decryptSecret, encryptSecret, hasTokenKey } from '../src/lib/crypto';
import { clicksByPost, countClick, isBot, linkTarget, totalClicks, trackLinks } from '../src/lib/links';
import { MAX_ATTEMPTS, publishNow, runDuePosts } from '../src/lib/publisher';
import * as repo from '../src/lib/repo';
import * as service from '../src/lib/service';
import { finishConnect, linkedinCommentary, listAccounts, startConnect, type SocialEnv } from '../src/lib/social';
import { isTimeZone, utcToZoned, zonedToUtc } from '../src/lib/time';
import type { Post, User } from '../src/lib/types';
import { today } from '../src/lib/util';
import { makeWorld, type World } from './helpers';

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i * 7 + 1)));
const ENV: SocialEnv & { APP_ORIGIN: string } = {
  TOKEN_KEY: KEY, X_CLIENT_ID: 'xid', X_CLIENT_SECRET: 'xsecret', LINKEDIN_CLIENT_ID: 'lid', LINKEDIN_CLIENT_SECRET: 'lsecret',
  X_API_BASE: 'https://fake-x', X_AUTH_BASE: 'https://fake-x', LINKEDIN_API_BASE: 'https://fake-li', LINKEDIN_AUTH_BASE: 'https://fake-li',
  APP_ORIGIN: 'https://room.test',
};

// ---------- a fake LinkedIn and X ----------
interface Call { url: string; method: string; headers: Headers; body: unknown }
let calls: Call[] = [];
let tweetStatus = 201;
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const fakeFetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
  const url = String(input);
  const method = init.method ?? 'GET';
  const body = typeof init.body === 'string' ? (init.body.startsWith('{') ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(init.body))) : init.body;
  calls.push({ url, method, headers: new Headers(init.headers), body });
  const path = url.replace(/^https:\/\/fake-(x|li)/, '');
  if (path === '/2/oauth2/token') return json(200, { access_token: `x-access-${calls.length}`, refresh_token: `x-refresh-${calls.length}`, expires_in: 7200 });
  if (path === '/2/users/me') return json(200, { data: { id: '42', name: 'Bookly', username: 'booklyapp' } });
  if (path === '/2/media/upload') return json(200, { data: { id: 'm-1' } });
  if (path === '/2/tweets') return tweetStatus < 300 ? json(tweetStatus, { data: { id: '1900' } }) : json(tweetStatus, { title: 'nope' });
  if (path === '/oauth/v2/accessToken') return json(200, { access_token: 'li-access', expires_in: 5184000 });
  if (path === '/v2/userinfo') return json(200, { sub: 'abc', name: 'Demo Owner' });
  if (path === '/rest/posts') return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:77' } });
  return json(404, {});
};

let w: World;
beforeEach(async () => {
  w = await makeWorld();
  calls = []; tweetStatus = 201;
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  // Bookly's avoid list would flag some test copy; the rules are tested elsewhere.
  await repo.setBrandConfig(w.db, w.acme.id, '{}');
  w.acme.brand_config = '{}';
});
afterEach(() => vi.unstubAllGlobals());

const connect = async (network: 'x' | 'linkedin', user: User = w.owner) => {
  const url = new URL(await startConnect(w.db, ENV, w.acme, user, network, 'https://room.test', '/w/acme/accounts'));
  const state = url.searchParams.get('state')!;
  const r = await finishConnect(w.db, ENV, network, 'https://room.test', new URLSearchParams({ state, code: 'c0de' }), user, async () => w.acme);
  if (!r.ok) throw new Error(r.error);
  return (await listAccounts(w.db, w.acme.id)).find((a) => a.network === network)!;
};

/** An approved X post due now on the connected account. */
const duePost = async (copy = 'Read less. Remember more. https://bookly.app/pricing', network: 'x' | 'linkedin' = 'x'): Promise<Post> => {
  const acc = await connect(network);
  const past = new Date(Date.now() - 60_000);
  const day = utcToZoned(past.toISOString(), w.acme.timezone).day;
  const time = utcToZoned(past.toISOString(), w.acme.timezone).time;
  const ed = await w.as(w.editor);
  const c = await service.createPost(w.db, w.acme, ed, { channel: network, copy, scheduled_for: day, scheduled_time: time, social_account_id: acc.id });
  if (!c.ok) throw new Error(c.error);
  await service.submitPost(w.db, w.acme, ed, c.value.post.id);
  const a = await service.reviewPost(w.db, w.acme, await w.as(w.owner), c.value.post.id, 'approve');
  if (!a.ok) throw new Error(a.error);
  return (await repo.getPost(w.db, w.acme.id, c.value.post.id))!;
};

describe('secrets', () => {
  it('round-trips and never stores the plain token', async () => {
    expect(hasTokenKey(KEY)).toBe(true);
    expect(hasTokenKey('short')).toBe(false);
    const sealed = await encryptSecret(KEY, 'top-secret');
    expect(sealed).not.toContain('top-secret');
    expect(await decryptSecret(KEY, sealed)).toBe('top-secret');
    const other = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));
    await expect(decryptSecret(other, sealed)).rejects.toThrow();
  });
});

describe('time zones', () => {
  it('turns local times into UTC instants and back', () => {
    expect(zonedToUtc('2026-11-20', '10:00', 'Asia/Karachi')).toBe('2026-11-20T05:00:00.000Z');
    expect(zonedToUtc('2026-07-01', '09:00', 'America/New_York')).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedToUtc('2026-12-01', '09:00', 'America/New_York')).toBe('2026-12-01T14:00:00.000Z');
    expect(utcToZoned('2026-11-20T05:00:00.000Z', 'Asia/Karachi')).toEqual({ day: '2026-11-20', time: '10:00' });
    expect(isTimeZone('Europe/London')).toBe(true);
    expect(isTimeZone('Mars/Base')).toBe(false);
  });
});

describe('LinkedIn text', () => {
  it('escapes reserved characters and keeps hashtags', () => {
    expect(linkedinCommentary('Read (more) #books_2026 now!')).toBe('Read \\(more\\) {hashtag|\\#|books\\_2026} now!');
    expect(linkedinCommentary('a@b [x] <y>')).toBe('a\\@b \\[x\\] \\<y\\>');
  });
});

describe('connecting accounts', () => {
  it('stores X and LinkedIn sign-ins encrypted', async () => {
    const x = await connect('x');
    expect(x.handle).toBe('booklyapp');
    const li = await connect('linkedin');
    expect(li.external_id).toBe('urn:li:person:abc');
    const raw = await w.db.prepare('SELECT access_token_enc, refresh_token_enc FROM social_accounts').all<{ access_token_enc: string; refresh_token_enc: string }>();
    for (const r of raw.results) { expect(r.access_token_enc.startsWith('v1.')).toBe(true); expect(r.access_token_enc).not.toContain('access'); }
    // X used PKCE.
    const authCall = calls.find((c) => c.url.endsWith('/2/oauth2/token'))!;
    expect((authCall.body as Record<string, string>).code_verifier).toBeTruthy();
  });
  it('rejects a callback finished by a different person, or replayed', async () => {
    const url = new URL(await startConnect(w.db, ENV, w.acme, w.owner, 'x', 'https://room.test', '/w/acme/accounts'));
    const state = url.searchParams.get('state')!;
    const stolen = await finishConnect(w.db, ENV, 'x', 'https://room.test', new URLSearchParams({ state, code: 'c' }), w.editor, async () => w.acme);
    expect(stolen.ok).toBe(false);
    const again = await finishConnect(w.db, ENV, 'x', 'https://room.test', new URLSearchParams({ state, code: 'c' }), w.owner, async () => w.acme);
    expect(again.ok).toBe(false);
    expect(await listAccounts(w.db, w.acme.id)).toHaveLength(0);
  });
});

describe('scheduling rules', () => {
  it('needs a matching network, a date and a time to post automatically', async () => {
    const acc = await connect('x');
    const ed = await w.as(w.editor);
    expect((await service.createPost(w.db, w.acme, ed, { channel: 'linkedin', copy: 'Hi', scheduled_for: '2030-01-01', scheduled_time: '09:00', social_account_id: acc.id })).ok).toBe(false);
    expect((await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'Hi', scheduled_for: '2030-01-01', social_account_id: acc.id })).ok).toBe(false);
    expect((await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'Hi', scheduled_time: '25:00' })).ok).toBe(false);
    const ok = await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'Hi', scheduled_for: '2030-01-01', scheduled_time: '09:00', social_account_id: acc.id });
    expect(ok.ok && ok.value.post.publish_at).toBe('2030-01-01T09:00:00.000Z');
  });
  it('an account from another workspace cannot be used', async () => {
    const acc = await connect('x');
    const r = await service.createPost(w.db, w.other, await w.as(w.outsider, w.other), { channel: 'x', copy: 'Hi', scheduled_for: '2030-01-01', scheduled_time: '09:00', social_account_id: acc.id });
    expect(r.ok).toBe(false);
  });
  it('moving the time keeps the approval; changing the account or text does not', async () => {
    const p = await duePost();
    const ed = await w.as(w.editor);
    const moved = await service.updatePost(w.db, w.acme, ed, p.id, { scheduled_time: '23:55' });
    expect(moved.ok && moved.value.post.status).toBe('approved');
    const off = await service.updatePost(w.db, w.acme, ed, p.id, { social_account_id: '' });
    expect(off.ok && off.value.post.status).toBe('approved');
    const acc = (await listAccounts(w.db, w.acme.id))[0]!;
    const on = await service.updatePost(w.db, w.acme, ed, p.id, { social_account_id: acc.id });
    expect(on.ok && on.value.post.status).toBe('draft');
  });
  it('a template image must be drawn before an automatic post can be approved', async () => {
    const acc = await connect('x');
    const ed = await w.as(w.editor);
    const c = await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'Hi', scheduled_for: '2030-01-01', scheduled_time: '09:00', social_account_id: acc.id,
      image: { template: 'announcement', theme: 'light', headline: 'Saved highlights' } });
    if (!c.ok) throw new Error(c.error);
    await service.submitPost(w.db, w.acme, ed, c.value.post.id);
    const early = await service.reviewPost(w.db, w.acme, await w.as(w.owner), c.value.post.id, 'approve');
    expect(early.ok).toBe(false);
    await w.db.prepare("INSERT INTO assets (id, workspace_id, r2_key, filename, content_type, size, kind, created_at) VALUES ('asset-1', ?, 'k', 'p.png', 'image/png', 1, 'made', '2026-01-01')").bind(w.acme.id).run();
    await repo.setRender(w.db, w.acme.id, c.value.post.id, 'asset-1', c.value.post.image);
    expect((await service.reviewPost(w.db, w.acme, await w.as(w.owner), c.value.post.id, 'approve')).ok).toBe(true);
  });
});

describe('the scheduler', () => {
  it('posts a due, approved post once, with short links in place of links', async () => {
    const p = await duePost();
    const out = await runDuePosts(w.db, ENV, ENV.APP_ORIGIN);
    expect(out).toEqual([{ id: p.id, result: 'published', url: 'https://x.com/booklyapp/status/1900' }]);
    const tweet = calls.find((c) => c.url.endsWith('/2/tweets'))!;
    const text = (tweet.body as { text: string }).text;
    expect(text).toMatch(/^Read less\. Remember more\. https:\/\/room\.test\/l\/[a-zA-Z0-9]{7}$/);
    const after = (await repo.getPost(w.db, w.acme.id, p.id))!;
    expect(after.status).toBe('published');
    expect(after.external_id).toBe('1900');
    // A second run finds nothing to do.
    expect(await runDuePosts(w.db, ENV, ENV.APP_ORIGIN)).toEqual([]);
    expect(calls.filter((c) => c.url.endsWith('/2/tweets'))).toHaveLength(1);
  });
  it('posts to LinkedIn with the escaped text', async () => {
    await duePost('Ten minutes a day (really). #reading', 'linkedin');
    const [o] = await runDuePosts(w.db, ENV, ENV.APP_ORIGIN);
    expect(o?.result).toBe('published');
    const post = calls.find((c) => c.url.endsWith('/rest/posts'))!;
    expect(post.headers.get('linkedin-version')).toBe('202610');
    expect((post.body as { commentary: string; author: string }).commentary).toBe('Ten minutes a day \\(really\\). {hashtag|\\#|reading}');
    expect((post.body as { author: string }).author).toBe('urn:li:person:abc');
  });
  it('leaves drafts, posts in review and future posts alone', async () => {
    const acc = await connect('x');
    const ed = await w.as(w.editor);
    await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'Draft', scheduled_for: '2020-01-01', scheduled_time: '09:00', social_account_id: acc.id });
    const later = await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'Later', scheduled_for: '2099-01-01', scheduled_time: '09:00', social_account_id: acc.id });
    if (!later.ok) throw new Error(later.error);
    await service.submitPost(w.db, w.acme, ed, later.value.post.id);
    await service.reviewPost(w.db, w.acme, await w.as(w.owner), later.value.post.id, 'approve');
    expect(await runDuePosts(w.db, ENV, ENV.APP_ORIGIN)).toEqual([]);
  });
  it('retries when X is busy and gives up after the last try, with a note on the post', async () => {
    const p = await duePost();
    tweetStatus = 503;
    const first = await runDuePosts(w.db, ENV, ENV.APP_ORIGIN);
    expect(first[0]?.result).toBe('retry');
    // Not again straight away.
    expect(await runDuePosts(w.db, ENV, ENV.APP_ORIGIN)).toEqual([]);
    // Pretend the waits have passed.
    for (let i = 2; i <= MAX_ATTEMPTS; i++) {
      await w.db.prepare('UPDATE posts SET publish_claimed_at = NULL WHERE id = ?').bind(p.id).run();
      const r = await runDuePosts(w.db, ENV, ENV.APP_ORIGIN);
      expect(r[0]?.result).toBe(i === MAX_ATTEMPTS ? 'failed' : 'retry');
    }
    const after = (await repo.getPost(w.db, w.acme.id, p.id))!;
    expect(after.status).toBe('approved');
    expect(after.publish_error).toMatch(/busy/);
    const log = await repo.listActivity(w.db, w.acme.id, 'post', p.id);
    expect(log.some((l) => l.action === 'publish_failed')).toBe(true);
    // "Try again now" works once X is back.
    tweetStatus = 201;
    const again = await publishNow(w.db, ENV, w.acme, p.id, ENV.APP_ORIGIN);
    expect(again.result).toBe('published');
  });
  it('a refused sign-in marks the account for reconnecting', async () => {
    await duePost();
    tweetStatus = 401;
    const [o] = await runDuePosts(w.db, ENV, ENV.APP_ORIGIN);
    expect(o?.result).toBe('failed');
    expect((await listAccounts(w.db, w.acme.id))[0]?.status).toBe('reconnect');
  });
  it('two runs at once post only once', async () => {
    await duePost();
    const [a, b] = await Promise.all([runDuePosts(w.db, ENV, ENV.APP_ORIGIN), runDuePosts(w.db, ENV, ENV.APP_ORIGIN)]);
    expect([...a!, ...b!].filter((o) => o.result === 'published')).toHaveLength(1);
    expect(calls.filter((c) => c.url.endsWith('/2/tweets'))).toHaveLength(1);
  });
});

describe('short links', () => {
  it('reuses one code per post and target, and counts people but not bots', async () => {
    const post = await service.createPost(w.db, w.acme, await w.as(w.editor), { channel: 'x', copy: 'x' });
    if (!post.ok) throw new Error(post.error);
    const postId = post.value.post.id;
    const text = await trackLinks(w.db, w.acme.id, postId, 'See https://bookly.app/a and https://bookly.app/a.', 'https://room.test');
    const codes = [...text.matchAll(/\/l\/(\w+)/g)].map((m) => m[1]);
    expect(codes).toHaveLength(2);
    expect(codes[0]).toBe(codes[1]);
    expect(text.endsWith('.')).toBe(true);
    const link = (await linkTarget(w.db, codes[0]!))!;
    expect(link.target_url).toBe('https://bookly.app/a');
    expect(isBot('LinkedInBot/1.0')).toBe(true);
    expect(isBot('Mozilla/5.0 (Macintosh) Safari/605')).toBe(false);
    await countClick(w.db, link);
    await countClick(w.db, link);
    expect(await totalClicks(w.db, w.acme.id, today())).toBe(2);
    expect(await totalClicks(w.db, w.other.id, today())).toBe(0);
    expect((await clicksByPost(w.db, w.acme.id, today())).get(postId)).toBe(2);
  });
});

describe('assets library', () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 4, 56, 0, 0, 4, 56, 8, 6, 0, 0, 0]);
  const store = new Map<string, Uint8Array>();
  const bucket = {
    put: async (k: string, v: Uint8Array) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
  } as unknown as R2Bucket;

  it('checks the file is what it says, and who may add it', async () => {
    const ed = await w.as(w.editor);
    const ok = await addAsset(w.db, bucket, w.acme, ed, new File([PNG], 'logo.png', { type: 'image/png' }), { tags: 'Logo, Brand!', alt: 'The logo' });
    expect(ok.ok && [ok.value.width, ok.value.height, ok.value.tags]).toEqual([1080, 1080, 'logo, brand']);
    expect(ok.ok && ok.value.r2_key.startsWith(`${w.acme.id}/`)).toBe(true);
    const fake = await addAsset(w.db, bucket, w.acme, ed, new File(['<html>'], 'x.png', { type: 'image/png' }), {});
    expect(fake.ok).toBe(false);
    const html = await addAsset(w.db, bucket, w.acme, ed, new File(['<html>'], 'x.html', { type: 'text/html' }), {});
    expect(html.ok).toBe(false);
    const viewer = await addAsset(w.db, bucket, w.acme, await w.as(w.viewer), new File([PNG], 'logo.png', { type: 'image/png' }), {});
    expect(viewer.ok).toBe(false);
  });
  it('will not delete a picture a planned post uses', async () => {
    const ed = await w.as(w.editor);
    const a = await addAsset(w.db, bucket, w.acme, ed, new File([PNG], 'p.png', { type: 'image/png' }), {});
    if (!a.ok) throw new Error(a.error);
    const p = await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'Hi', asset_id: a.value.id });
    expect(p.ok).toBe(true);
    expect((await deleteAsset(w.db, bucket, w.acme, ed, a.value.id)).ok).toBe(false);
    // Another workspace cannot use or see it.
    const stolen = await service.createPost(w.db, w.other, await w.as(w.outsider, w.other), { channel: 'x', copy: 'Hi', asset_id: a.value.id });
    expect(stolen.ok).toBe(false);
  });
});
