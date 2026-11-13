// LinkedIn and X: connecting an account (OAuth 2.0 with PKCE) and posting to it.
// Plain fetch, no SDKs. Base URLs can be overridden by env so tests can run against a fake server.
import { decryptSecret, encryptSecret, hasTokenKey } from './crypto';
import type { User, Workspace } from './types';
import { addSeconds, newId, nowIso, randomToken, sha256B64Url, sha256Hex } from './util';

type DB = D1Database;
export type Network = 'linkedin' | 'x';
export const NETWORK_NAMES: Record<Network, string> = { linkedin: 'LinkedIn', x: 'X' };
export const isNetwork = (v: unknown): v is Network => v === 'linkedin' || v === 'x';

export interface SocialEnv {
  TOKEN_KEY?: string;
  LINKEDIN_CLIENT_ID?: string; LINKEDIN_CLIENT_SECRET?: string; LINKEDIN_API_VERSION?: string;
  /** "1" once LinkedIn has approved MuzMesh for company page posting (Community Management API). */
  LINKEDIN_ORG_POSTING?: string;
  X_CLIENT_ID?: string; X_CLIENT_SECRET?: string;
  LINKEDIN_AUTH_BASE?: string; LINKEDIN_API_BASE?: string; X_AUTH_BASE?: string; X_API_BASE?: string;
}

export interface SocialAccount {
  id: string; workspace_id: string; network: Network; kind: 'person' | 'organization'; external_id: string;
  name: string; handle: string; access_token_enc: string; refresh_token_enc: string;
  expires_at: string | null; refresh_expires_at: string | null; status: 'ok' | 'reconnect'; last_error: string;
  connected_by: string | null; created_at: string; updated_at: string;
}
export type PublicAccount = Omit<SocialAccount, 'access_token_enc' | 'refresh_token_enc'>;

const li = (env: SocialEnv) => ({
  auth: env.LINKEDIN_AUTH_BASE ?? 'https://www.linkedin.com',
  api: env.LINKEDIN_API_BASE ?? 'https://api.linkedin.com',
  version: env.LINKEDIN_API_VERSION ?? '202610',
});
const xb = (env: SocialEnv) => ({ auth: env.X_AUTH_BASE ?? 'https://x.com', api: env.X_API_BASE ?? 'https://api.x.com' });

/** Why a network cannot be connected yet, or '' when it can. */
export const setupProblem = (env: SocialEnv, network: Network): string => {
  if (!hasTokenKey(env.TOKEN_KEY)) return 'TOKEN_KEY is not set, so tokens cannot be stored safely.';
  if (network === 'linkedin' && !(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET)) return 'The LinkedIn app keys are not set yet.';
  if (network === 'x' && !(env.X_CLIENT_ID && env.X_CLIENT_SECRET)) return 'The X app keys are not set yet.';
  return '';
};

const LINKEDIN_SCOPES = (env: SocialEnv) => ['openid', 'profile', 'w_member_social', ...(env.LINKEDIN_ORG_POSTING === '1' ? ['w_organization_social', 'r_organization_admin'] : [])];
const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'];

export const callbackUrl = (origin: string, network: Network) => `${origin}/connect/${network}/callback`;

// ---------- accounts ----------
export const listAccounts = async (db: DB, workspaceId: string): Promise<PublicAccount[]> =>
  (await db.prepare(`SELECT id, workspace_id, network, kind, external_id, name, handle, expires_at, refresh_expires_at, status, last_error, connected_by, created_at, updated_at
    FROM social_accounts WHERE workspace_id = ? ORDER BY network, kind DESC, name`).bind(workspaceId).all<PublicAccount>()).results;

export const getAccount = (db: DB, workspaceId: string, id: string) =>
  db.prepare('SELECT * FROM social_accounts WHERE workspace_id = ? AND id = ?').bind(workspaceId, id).first<SocialAccount>();

export const removeAccount = async (db: DB, workspaceId: string, id: string): Promise<boolean> =>
  ((await db.prepare('DELETE FROM social_accounts WHERE workspace_id = ? AND id = ?').bind(workspaceId, id).run()).meta.changes ?? 0) > 0;

export const markReconnect = (db: DB, id: string, why: string) =>
  db.prepare("UPDATE social_accounts SET status = 'reconnect', last_error = ?, updated_at = ? WHERE id = ?").bind(why.slice(0, 500), nowIso(), id).run();

interface TokenSet { access: string; refresh: string; expiresIn: number; refreshExpiresIn?: number }
interface Identity { kind: 'person' | 'organization'; externalId: string; name: string; handle: string }

const saveAccount = async (db: DB, env: SocialEnv, ws: Workspace, user: User, network: Network, who: Identity, t: TokenSet) => {
  const key = env.TOKEN_KEY!;
  const now = nowIso();
  const access = await encryptSecret(key, t.access);
  const refresh = await encryptSecret(key, t.refresh);
  const exp = t.expiresIn ? addSeconds(t.expiresIn) : null;
  const rexp = t.refreshExpiresIn ? addSeconds(t.refreshExpiresIn) : null;
  await db.prepare(`INSERT INTO social_accounts (id, workspace_id, network, kind, external_id, name, handle, access_token_enc, refresh_token_enc, expires_at, refresh_expires_at, status, last_error, connected_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok', '', ?, ?, ?)
    ON CONFLICT (workspace_id, network, external_id) DO UPDATE SET name = excluded.name, handle = excluded.handle, kind = excluded.kind,
      access_token_enc = excluded.access_token_enc, refresh_token_enc = excluded.refresh_token_enc, expires_at = excluded.expires_at,
      refresh_expires_at = excluded.refresh_expires_at, status = 'ok', last_error = '', connected_by = excluded.connected_by, updated_at = excluded.updated_at`)
    .bind(newId(), ws.id, network, who.kind, who.externalId, who.name.slice(0, 120), who.handle.slice(0, 120), access, refresh, exp, rexp, user.id, now, now).run();
};

// ---------- connecting ----------
/** Starts "Connect LinkedIn / X": returns the URL to send the person to. */
export const startConnect = async (db: DB, env: SocialEnv, ws: Workspace, user: User, network: Network, origin: string, returnTo: string): Promise<string> => {
  const state = randomToken();
  const verifier = randomToken();
  await db.prepare('INSERT INTO social_oauth_states (state_hash, workspace_id, user_id, network, code_verifier, return_to, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(await sha256Hex(state), ws.id, user.id, network, verifier, returnTo, addSeconds(600)).run();
  const redirect = callbackUrl(origin, network);
  if (network === 'linkedin') {
    const q = new URLSearchParams({ response_type: 'code', client_id: env.LINKEDIN_CLIENT_ID!, redirect_uri: redirect, state, scope: LINKEDIN_SCOPES(env).join(' ') });
    return `${li(env).auth}/oauth/v2/authorization?${q}`;
  }
  const q = new URLSearchParams({
    response_type: 'code', client_id: env.X_CLIENT_ID!, redirect_uri: redirect, state, scope: X_SCOPES.join(' '),
    code_challenge: await sha256B64Url(verifier), code_challenge_method: 'S256',
  });
  return `${xb(env).auth}/i/oauth2/authorize?${q}`;
};

export type ConnectResult = { ok: true; workspaceId: string; returnTo: string; added: string[] } | { ok: false; workspaceId?: string; returnTo?: string; error: string };

const basic = (id: string, secret: string) => `Basic ${btoa(`${encodeURIComponent(id)}:${encodeURIComponent(secret)}`)}`;
const form = (o: Record<string, string>) => new URLSearchParams(o).toString();
const FORM = 'application/x-www-form-urlencoded';

/** The callback after the person allowed (or refused) access on LinkedIn or X. */
export const finishConnect = async (db: DB, env: SocialEnv, network: Network, origin: string, q: URLSearchParams, user: User, wsFor: (id: string) => Promise<Workspace | null>): Promise<ConnectResult> => {
  const state = q.get('state') ?? '';
  if (!state || state.length > 200) return { ok: false, error: 'The sign-in came back without its security check. Start again.' };
  const hash = await sha256Hex(state);
  const row = await db.prepare('DELETE FROM social_oauth_states WHERE state_hash = ? RETURNING *')
    .bind(hash).first<{ workspace_id: string; user_id: string; network: string; code_verifier: string; return_to: string; expires_at: string }>();
  if (!row || row.network !== network || row.expires_at <= nowIso()) return { ok: false, error: 'That sign-in expired. Start again.' };
  const base = { workspaceId: row.workspace_id, returnTo: row.return_to };
  // The person who started it must be the one finishing it, so a link cannot be passed to someone else.
  if (row.user_id !== user.id) return { ok: false, ...base, error: 'This sign-in was started by someone else.' };
  if (q.get('error')) return { ok: false, ...base, error: `${NETWORK_NAMES[network]} did not give access${q.get('error') === 'access_denied' || q.get('error') === 'user_cancelled_authorize' ? ' (it was cancelled)' : ''}.` };
  const code = q.get('code') ?? '';
  if (!code) return { ok: false, ...base, error: 'No authorisation code came back. Start again.' };
  const ws = await wsFor(row.workspace_id);
  if (!ws) return { ok: false, error: 'Workspace not found.' };
  const redirect = callbackUrl(origin, network);
  try {
    if (network === 'linkedin') {
      const r = await fetch(`${li(env).auth}/oauth/v2/accessToken`, { method: 'POST', headers: { 'content-type': FORM },
        body: form({ grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: env.LINKEDIN_CLIENT_ID!, client_secret: env.LINKEDIN_CLIENT_SECRET! }) });
      const t = await r.json() as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number };
      if (!r.ok || !t.access_token) return { ok: false, ...base, error: `LinkedIn refused the sign-in (${r.status}).` };
      const tokens: TokenSet = { access: t.access_token, refresh: t.refresh_token ?? '', expiresIn: t.expires_in ?? 0, refreshExpiresIn: t.refresh_token_expires_in };
      const me = await fetch(`${li(env).api}/v2/userinfo`, { headers: { authorization: `Bearer ${t.access_token}` } });
      const info = await me.json() as { sub?: string; name?: string };
      if (!me.ok || !info.sub) return { ok: false, ...base, error: 'Could not read the LinkedIn profile.' };
      const added: string[] = [];
      await saveAccount(db, env, ws, user, 'linkedin', { kind: 'person', externalId: `urn:li:person:${info.sub}`, name: info.name ?? 'LinkedIn profile', handle: '' }, tokens);
      added.push(`${info.name ?? 'Your profile'} (personal profile)`);
      if (env.LINKEDIN_ORG_POSTING === '1') {
        for (const org of await linkedinPages(env, t.access_token)) {
          await saveAccount(db, env, ws, user, 'linkedin', { kind: 'organization', externalId: org.urn, name: org.name, handle: '' }, tokens);
          added.push(`${org.name} (company page)`);
        }
      }
      return { ok: true, ...base, added };
    }
    const r = await fetch(`${xb(env).api}/2/oauth2/token`, { method: 'POST', headers: { 'content-type': FORM, authorization: basic(env.X_CLIENT_ID!, env.X_CLIENT_SECRET!) },
      body: form({ grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: row.code_verifier, client_id: env.X_CLIENT_ID! }) });
    const t = await r.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!r.ok || !t.access_token) return { ok: false, ...base, error: `X refused the sign-in (${r.status}).` };
    const me = await fetch(`${xb(env).api}/2/users/me`, { headers: { authorization: `Bearer ${t.access_token}` } });
    const info = await me.json() as { data?: { id?: string; name?: string; username?: string } };
    if (!me.ok || !info.data?.id) return { ok: false, ...base, error: 'Could not read the X account.' };
    await saveAccount(db, env, ws, user, 'x', { kind: 'person', externalId: info.data.id, name: info.data.name ?? '', handle: info.data.username ?? '' },
      { access: t.access_token, refresh: t.refresh_token ?? '', expiresIn: t.expires_in ?? 7200 });
    return { ok: true, ...base, added: [`@${info.data.username ?? info.data.id}`] };
  } catch (e) {
    console.error('connect failed', network, e);
    return { ok: false, ...base, error: `Could not reach ${NETWORK_NAMES[network]}. Try again in a minute.` };
  }
};

/** Company pages the member administers. Needs LinkedIn's approval for company page access. */
const linkedinPages = async (env: SocialEnv, token: string): Promise<{ urn: string; name: string }[]> => {
  const { api, version } = li(env);
  const h = { authorization: `Bearer ${token}`, 'linkedin-version': version, 'x-restli-protocol-version': '2.0.0' };
  const r = await fetch(`${api}/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`, { headers: h });
  if (!r.ok) return [];
  const acl = await r.json() as { elements?: { organization?: string }[] };
  const out: { urn: string; name: string }[] = [];
  for (const el of (acl.elements ?? []).slice(0, 20)) {
    const urn = el.organization ?? '';
    const id = /^urn:li:organization:(\d+)$/.exec(urn)?.[1];
    if (!id) continue;
    const o = await fetch(`${api}/rest/organizations/${id}`, { headers: h });
    const org = o.ok ? await o.json() as { localizedName?: string } : {};
    out.push({ urn, name: org.localizedName ?? `Company page ${id}` });
  }
  return out;
};

// ---------- posting ----------
export class PublishError extends Error {
  /** auth: reconnect the account. retry: try again later. fatal: a person has to look. */
  constructor(public kind: 'auth' | 'retry' | 'fatal', message: string) { super(message); }
}
const fromStatus = (network: Network, what: string, status: number, body: string): PublishError => {
  const name = NETWORK_NAMES[network];
  const detail = body.slice(0, 300).replace(/\s+/g, ' ');
  if (status === 401) return new PublishError('auth', `${name} no longer accepts this account's sign-in. Reconnect it.`);
  if (status === 429 || status >= 500) return new PublishError('retry', `${name} was busy (${status}) while ${what}. Trying again shortly.`);
  if (status === 403) return new PublishError('fatal', `${name} refused ${what} (403). The account may lack permission. ${detail}`);
  return new PublishError('fatal', `${name} rejected ${what} (${status}). ${detail}`);
};

/** A valid access token, refreshed first when it is about to run out. */
export const accessTokenFor = async (db: DB, env: SocialEnv, acc: SocialAccount): Promise<string> => {
  if (acc.status === 'reconnect') throw new PublishError('auth', `${NETWORK_NAMES[acc.network]} account needs reconnecting.`);
  const key = env.TOKEN_KEY;
  if (!hasTokenKey(key)) throw new PublishError('fatal', 'TOKEN_KEY is not set.');
  const soon = new Date(Date.now() + 5 * 60_000).toISOString();
  if (!acc.expires_at || acc.expires_at > soon) return decryptSecret(key, acc.access_token_enc);
  const refresh = await decryptSecret(key, acc.refresh_token_enc);
  if (!refresh) throw new PublishError('auth', `The ${NETWORK_NAMES[acc.network]} sign-in expired. Reconnect the account.`);
  let r: Response;
  if (acc.network === 'x') {
    r = await fetch(`${xb(env).api}/2/oauth2/token`, { method: 'POST', headers: { 'content-type': FORM, authorization: basic(env.X_CLIENT_ID ?? '', env.X_CLIENT_SECRET ?? '') },
      body: form({ grant_type: 'refresh_token', refresh_token: refresh, client_id: env.X_CLIENT_ID ?? '' }) });
  } else {
    r = await fetch(`${li(env).auth}/oauth/v2/accessToken`, { method: 'POST', headers: { 'content-type': FORM },
      body: form({ grant_type: 'refresh_token', refresh_token: refresh, client_id: env.LINKEDIN_CLIENT_ID ?? '', client_secret: env.LINKEDIN_CLIENT_SECRET ?? '' }) });
  }
  if (r.status >= 500 || r.status === 429) throw new PublishError('retry', `${NETWORK_NAMES[acc.network]} was busy renewing the sign-in.`);
  const t = await r.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number };
  if (!r.ok || !t.access_token) throw new PublishError('auth', `The ${NETWORK_NAMES[acc.network]} sign-in could not be renewed. Reconnect the account.`);
  // X issues a new refresh token each time; keep the old one only if none came back.
  await db.prepare('UPDATE social_accounts SET access_token_enc = ?, refresh_token_enc = ?, expires_at = ?, refresh_expires_at = COALESCE(?, refresh_expires_at), updated_at = ? WHERE id = ?')
    .bind(await encryptSecret(key, t.access_token), await encryptSecret(key, t.refresh_token || refresh), addSeconds(t.expires_in ?? 7200),
      t.refresh_token_expires_in ? addSeconds(t.refresh_token_expires_in) : null, nowIso(), acc.id).run();
  return t.access_token;
};

/**
 * LinkedIn's post text format reserves some characters. They are escaped so they show as typed,
 * except "#word", which becomes a real hashtag.
 */
export const linkedinCommentary = (text: string): string => {
  const out: string[] = [];
  const re = /#([\p{L}\p{N}_]+)/gu;
  let last = 0;
  const esc = (s: string) => s.replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
  for (const m of text.matchAll(re)) {
    out.push(esc(text.slice(last, m.index)));
    out.push(`{hashtag|\\#|${esc(m[1]!)}}`);
    last = m.index! + m[0].length;
  }
  out.push(esc(text.slice(last)));
  return out.join('');
};

export interface OutgoingImage { bytes: ArrayBuffer; contentType: string; alt: string }
export interface Published { externalId: string; url: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const publishTo = async (env: SocialEnv, acc: SocialAccount, token: string, text: string, image: OutgoingImage | null): Promise<Published> => {
  const net = (what: string) => (e: unknown) => { if (e instanceof PublishError) throw e; throw new PublishError('retry', `Could not reach ${NETWORK_NAMES[acc.network]} while ${what}.`); };
  if (acc.network === 'linkedin') {
    const { api, version } = li(env);
    const h = { authorization: `Bearer ${token}`, 'linkedin-version': version, 'x-restli-protocol-version': '2.0.0', 'content-type': 'application/json' };
    let media: string | null = null;
    if (image) {
      const init = await fetch(`${api}/rest/images?action=initializeUpload`, { method: 'POST', headers: h, body: JSON.stringify({ initializeUploadRequest: { owner: acc.external_id } }) }).catch(net('preparing the image'));
      if (!init.ok) throw fromStatus('linkedin', 'the image', init.status, await init.text());
      const v = (await init.json() as { value?: { uploadUrl?: string; image?: string } }).value;
      if (!v?.uploadUrl || !v.image) throw new PublishError('fatal', 'LinkedIn did not return an upload address for the image.');
      const put = await fetch(v.uploadUrl, { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: image.bytes }).catch(net('uploading the image'));
      if (!put.ok) throw fromStatus('linkedin', 'the image upload', put.status, await put.text());
      // LinkedIn processes the image before it can be used.
      for (let i = 0; i < 6; i++) {
        const s = await fetch(`${api}/rest/images/${encodeURIComponent(v.image)}`, { headers: h }).catch(() => null);
        const st = s?.ok ? (await s.json() as { status?: string }).status : undefined;
        if (st === 'AVAILABLE') break;
        if (st === 'PROCESSING_FAILED') throw new PublishError('fatal', 'LinkedIn could not process the image.');
        await sleep(1500);
      }
      media = v.image;
    }
    const body = {
      author: acc.external_id, commentary: linkedinCommentary(text), visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false,
      ...(media ? { content: { media: { id: media, altText: image!.alt.slice(0, 4000) } } } : {}),
    };
    const r = await fetch(`${api}/rest/posts`, { method: 'POST', headers: h, body: JSON.stringify(body) }).catch(net('posting'));
    if (!r.ok) throw fromStatus('linkedin', 'the post', r.status, await r.text());
    const id = r.headers.get('x-restli-id') ?? '';
    return { externalId: id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : '' };
  }

  const { api } = xb(env);
  const auth = { authorization: `Bearer ${token}` };
  let mediaId: string | null = null;
  if (image) {
    const fd = new FormData();
    fd.set('media', new Blob([image.bytes], { type: image.contentType }), 'image');
    fd.set('media_category', 'tweet_image');
    const up = await fetch(`${api}/2/media/upload`, { method: 'POST', headers: auth, body: fd }).catch(net('uploading the image'));
    if (!up.ok) throw fromStatus('x', 'the image upload', up.status, await up.text());
    mediaId = (await up.json() as { data?: { id?: string } }).data?.id ?? null;
    if (!mediaId) throw new PublishError('fatal', 'X did not return an id for the image.');
  }
  const r = await fetch(`${api}/2/tweets`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ text, ...(mediaId ? { media: { media_ids: [mediaId] } } : {}) }) }).catch(net('posting'));
  if (!r.ok) throw fromStatus('x', 'the post', r.status, await r.text());
  const id = (await r.json() as { data?: { id?: string } }).data?.id ?? '';
  return { externalId: id, url: id ? `https://x.com/${acc.handle || 'i/web'}/status/${id}` : '' };
};

/** Days until a LinkedIn sign-in runs out. LinkedIn tokens last 60 days and usually cannot be renewed without the person. */
export const daysLeft = (acc: Pick<PublicAccount, 'expires_at' | 'refresh_expires_at' | 'network'>): number | null => {
  const until = acc.network === 'x' ? acc.refresh_expires_at : (acc.refresh_expires_at ?? acc.expires_at);
  if (!until) return null;
  return Math.floor((Date.parse(until) - Date.now()) / 86_400_000);
};
