// OAuth 2.1 authorization server for the MCP connector (Claude, ChatGPT and other MCP clients).
// Public clients only: PKCE with S256 is required, there are no client secrets.
// Codes, access tokens and refresh tokens are random, single-purpose and stored only as SHA-256 hashes.
import * as repo from './repo';
import type { Role, User, Workspace } from './types';
import { addSeconds, newId, nowIso, randomToken, sha256B64Url, sha256Hex, safeEqual } from './util';

type DB = D1Database;
export const CODE_SECONDS = 5 * 60;
export const ACCESS_SECONDS = 60 * 60;
export const REFRESH_SECONDS = 30 * 24 * 60 * 60;
export const SCOPE = 'launchroom';

export interface OAuthClient { client_id: string; client_name: string; redirect_uris: string[]; created_at: string }

/** https anywhere, or http on the loopback interface (desktop apps and local tools). Nothing else. */
export const isAllowedRedirect = (raw: unknown): raw is string => {
  if (typeof raw !== 'string' || raw.length > 500) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.hash || u.username || u.password) return false;
  if (u.protocol === 'https:') return true;
  return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]');
};

export type RegisterResult = { ok: true; client: OAuthClient } | { ok: false; error: string; description: string };

/** Dynamic client registration (RFC 7591). */
export const registerClient = async (db: DB, body: unknown): Promise<RegisterResult> => {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const uris = b.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 5 || !uris.every(isAllowedRedirect)) {
    return { ok: false, error: 'invalid_redirect_uri', description: 'redirect_uris must be 1 to 5 https URLs (http is allowed for localhost only).' };
  }
  const method = b.token_endpoint_auth_method;
  if (method !== undefined && method !== 'none') {
    return { ok: false, error: 'invalid_client_metadata', description: 'Only public clients are supported: token_endpoint_auth_method must be "none".' };
  }
  const name = (typeof b.client_name === 'string' ? b.client_name : '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 80) || 'Unnamed app';
  const client: OAuthClient = { client_id: newId(), client_name: name, redirect_uris: uris as string[], created_at: nowIso() };
  await db.prepare('INSERT INTO oauth_clients (client_id, client_name, redirect_uris, created_at) VALUES (?, ?, ?, ?)')
    .bind(client.client_id, client.client_name, JSON.stringify(client.redirect_uris), client.created_at).run();
  return { ok: true, client };
};

export const getClient = async (db: DB, clientId: string): Promise<OAuthClient | null> => {
  if (!clientId || clientId.length > 100) return null;
  const row = await db.prepare('SELECT * FROM oauth_clients WHERE client_id = ?').bind(clientId).first<{ client_id: string; client_name: string; redirect_uris: string; created_at: string }>();
  if (!row) return null;
  let uris: string[] = [];
  try { uris = JSON.parse(row.redirect_uris) as string[]; } catch { /* treated as no URIs */ }
  return { ...row, redirect_uris: uris };
};

export interface AuthorizeParams { client: OAuthClient; redirectUri: string; state: string; codeChallenge: string }
export type AuthorizeCheck =
  | { ok: true; params: AuthorizeParams }
  /** Show an error page: the redirect target cannot be trusted. */
  | { ok: false; kind: 'page'; message: string }
  /** Safe to send the error back to the client's redirect URI. */
  | { ok: false; kind: 'redirect'; redirectUri: string; state: string; error: string; description: string };

/** Validates an authorization request. Never redirects to a URI that is not registered for the client. */
export const checkAuthorizeRequest = async (db: DB, q: URLSearchParams, resource: string): Promise<AuthorizeCheck> => {
  const client = await getClient(db, q.get('client_id') ?? '');
  if (!client) return { ok: false, kind: 'page', message: 'This app is not registered with Launch Room. Remove the connector and add it again.' };
  const redirectUri = q.get('redirect_uri') ?? '';
  if (!client.redirect_uris.includes(redirectUri)) return { ok: false, kind: 'page', message: 'The app asked to return to an address it did not register. Nothing was shared.' };
  const state = (q.get('state') ?? '').slice(0, 1000);
  const back = (error: string, description: string): AuthorizeCheck => ({ ok: false, kind: 'redirect', redirectUri, state, error, description });
  if (q.get('response_type') !== 'code') return back('unsupported_response_type', 'Only response_type=code is supported.');
  const challenge = q.get('code_challenge') ?? '';
  if (q.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) return back('invalid_request', 'PKCE with code_challenge_method=S256 is required.');
  const res = q.get('resource');
  if (res && res.replace(/\/$/, '') !== resource.replace(/\/$/, '')) return back('invalid_target', 'Unknown resource.');
  return { ok: true, params: { client, redirectUri, state, codeChallenge: challenge } };
};

export const redirectWith = (redirectUri: string, params: Record<string, string>): string => {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  return u.toString();
};

/** Called when the signed-in user clicks Allow. Creates the grant and a one-time code. */
export const issueCode = async (db: DB, p: AuthorizeParams, user: User, workspace: Workspace): Promise<string> => {
  const grantId = newId();
  const code = randomToken();
  await db.batch([
    db.prepare('INSERT INTO oauth_grants (id, client_id, user_id, workspace_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(grantId, p.client.client_id, user.id, workspace.id, nowIso()),
    db.prepare('INSERT INTO oauth_codes (code_hash, grant_id, redirect_uri, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await sha256Hex(code), grantId, p.redirectUri, p.codeChallenge, addSeconds(CODE_SECONDS)),
  ]);
  return code;
};

export type TokenResult =
  | { ok: true; body: { access_token: string; token_type: 'Bearer'; expires_in: number; refresh_token: string; scope: string } }
  | { ok: false; error: 'invalid_request' | 'invalid_grant' | 'invalid_client' | 'unsupported_grant_type'; description: string };

const issueTokens = async (db: DB, grantId: string): Promise<TokenResult> => {
  const access = randomToken();
  const refresh = randomToken();
  const t = nowIso();
  await db.batch([
    db.prepare("INSERT INTO oauth_tokens (token_hash, kind, grant_id, expires_at, created_at) VALUES (?, 'access', ?, ?, ?)").bind(await sha256Hex(access), grantId, addSeconds(ACCESS_SECONDS), t),
    db.prepare("INSERT INTO oauth_tokens (token_hash, kind, grant_id, expires_at, created_at) VALUES (?, 'refresh', ?, ?, ?)").bind(await sha256Hex(refresh), grantId, addSeconds(REFRESH_SECONDS), t),
  ]);
  return { ok: true, body: { access_token: access, token_type: 'Bearer', expires_in: ACCESS_SECONDS, refresh_token: refresh, scope: SCOPE } };
};

const revokeGrant = (db: DB, grantId: string) =>
  db.prepare('UPDATE oauth_grants SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').bind(nowIso(), grantId).run();

const bad = (description: string): TokenResult => ({ ok: false, error: 'invalid_grant', description });

/** The token endpoint: authorization_code and refresh_token grants. */
export const exchangeToken = async (db: DB, form: URLSearchParams): Promise<TokenResult> => {
  const grantType = form.get('grant_type');
  const clientId = form.get('client_id') ?? '';
  const t = nowIso();

  if (grantType === 'authorization_code') {
    const code = form.get('code') ?? '';
    const verifier = form.get('code_verifier') ?? '';
    if (!code || !clientId || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return { ok: false, error: 'invalid_request', description: 'code, client_id and a valid code_verifier are required.' };
    const hash = await sha256Hex(code);
    const row = await db.prepare(`SELECT c.grant_id, c.redirect_uri, c.code_challenge, c.expires_at, c.used_at, g.client_id, g.revoked_at
      FROM oauth_codes c JOIN oauth_grants g ON g.id = c.grant_id WHERE c.code_hash = ?`).bind(hash)
      .first<{ grant_id: string; redirect_uri: string; code_challenge: string; expires_at: string; used_at: string | null; client_id: string; revoked_at: string | null }>();
    if (!row) return bad('Unknown code.');
    if (row.used_at) {
      // A code presented twice means it leaked. Kill everything issued from it.
      await revokeGrant(db, row.grant_id);
      return bad('Code already used.');
    }
    if (row.revoked_at || row.expires_at <= t) return bad('Code expired.');
    if (row.client_id !== clientId) return bad('Code was issued to another client.');
    if (row.redirect_uri !== (form.get('redirect_uri') ?? '')) return bad('redirect_uri does not match.');
    if (!safeEqual(await sha256B64Url(verifier), row.code_challenge)) return bad('PKCE verification failed.');
    // Single statement, so only one of two simultaneous exchanges can win.
    const claimed = await db.prepare('UPDATE oauth_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL').bind(t, hash).run();
    if (!(claimed.meta.changes ?? 0)) { await revokeGrant(db, row.grant_id); return bad('Code already used.'); }
    return issueTokens(db, row.grant_id);
  }

  if (grantType === 'refresh_token') {
    const token = form.get('refresh_token') ?? '';
    if (!token || !clientId) return { ok: false, error: 'invalid_request', description: 'refresh_token and client_id are required.' };
    const hash = await sha256Hex(token);
    const row = await db.prepare(`SELECT k.grant_id, k.expires_at, k.used_at, g.client_id, g.revoked_at
      FROM oauth_tokens k JOIN oauth_grants g ON g.id = k.grant_id WHERE k.token_hash = ? AND k.kind = 'refresh'`).bind(hash)
      .first<{ grant_id: string; expires_at: string; used_at: string | null; client_id: string; revoked_at: string | null }>();
    if (!row) return bad('Unknown refresh token.');
    if (row.client_id !== clientId) return bad('Token was issued to another client.');
    if (row.used_at) { await revokeGrant(db, row.grant_id); return bad('Refresh token already used.'); }
    if (row.revoked_at || row.expires_at <= t) return bad('Refresh token expired or revoked.');
    const claimed = await db.prepare('UPDATE oauth_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL').bind(t, hash).run();
    if (!(claimed.meta.changes ?? 0)) { await revokeGrant(db, row.grant_id); return bad('Refresh token already used.'); }
    return issueTokens(db, row.grant_id);
  }

  return { ok: false, error: 'unsupported_grant_type', description: 'Use authorization_code or refresh_token.' };
};

export interface TokenIdentity { user: User; workspace: Workspace; role: Role; grantId: string }

/**
 * Resolves a bearer token to a user, a workspace and the user's CURRENT role there.
 * The role is read on every call, so removing someone from a workspace cuts off their connector at once.
 */
export const identityForToken = async (db: DB, bearer: string): Promise<TokenIdentity | null> => {
  if (!bearer || bearer.length > 200) return null;
  const row = await db.prepare(`SELECT g.id AS grant_id, g.user_id, g.workspace_id FROM oauth_tokens k JOIN oauth_grants g ON g.id = k.grant_id
    WHERE k.token_hash = ? AND k.kind = 'access' AND k.expires_at > ? AND g.revoked_at IS NULL`).bind(await sha256Hex(bearer), nowIso())
    .first<{ grant_id: string; user_id: string; workspace_id: string }>();
  if (!row) return null;
  const [user, workspace] = await Promise.all([repo.getUserById(db, row.user_id), repo.getWorkspaceById(db, row.workspace_id)]);
  if (!user || !workspace) return null;
  const role = await repo.roleIn(db, user, workspace.id);
  if (!role) return null;
  return { user, workspace, role, grantId: row.grant_id };
};

export const touchGrant = (db: DB, grantId: string) =>
  db.prepare('UPDATE oauth_grants SET last_used_at = ? WHERE id = ?').bind(nowIso(), grantId).run();

export interface GrantRow { id: string; client_name: string; workspace_name: string; workspace_slug: string; created_at: string; last_used_at: string | null }
export const listGrantsForUser = async (db: DB, userId: string) =>
  (await db.prepare(`SELECT g.id, c.client_name, w.name AS workspace_name, w.slug AS workspace_slug, g.created_at, g.last_used_at
    FROM oauth_grants g JOIN oauth_clients c ON c.client_id = g.client_id JOIN workspaces w ON w.id = g.workspace_id
    WHERE g.user_id = ? AND g.revoked_at IS NULL
      AND EXISTS (SELECT 1 FROM oauth_tokens k WHERE k.grant_id = g.id AND k.expires_at > ? AND k.used_at IS NULL)
    ORDER BY g.created_at DESC`).bind(userId, nowIso()).all<GrantRow>()).results;

export const revokeGrantForUser = async (db: DB, userId: string, grantId: string): Promise<boolean> => {
  const r = await db.prepare('UPDATE oauth_grants SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL').bind(nowIso(), grantId, userId).run();
  return (r.meta.changes ?? 0) > 0;
};

export const authServerMetadata = (origin: string) => ({
  issuer: origin,
  authorization_endpoint: `${origin}/oauth/authorize`,
  token_endpoint: `${origin}/oauth/token`,
  registration_endpoint: `${origin}/oauth/register`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  scopes_supported: [SCOPE],
});

export const resourceMetadata = (origin: string) => ({
  resource: `${origin}/mcp`,
  authorization_servers: [origin],
  scopes_supported: [SCOPE],
  bearer_methods_supported: ['header'],
  resource_name: 'Launch Room',
});
