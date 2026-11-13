// Website stats from Google Analytics 4 and Search Console, pulled with a service account.
// The client adds the service account's email as a Viewer on their GA4 property and as a user in
// Search Console. Results are stored as a snapshot, so the dashboard never waits on Google.
import { b64Decode, b64urlEncode } from './crypto';
import type { Workspace } from './types';
import { nowIso } from './util';

type DB = D1Database;
export interface StatsEnv { GOOGLE_SERVICE_ACCOUNT?: string; GA4_API_BASE?: string; GSC_API_BASE?: string; GOOGLE_TOKEN_URL?: string }

interface ServiceAccount { client_email: string; private_key: string; token_uri?: string }
export const serviceAccount = (env: StatsEnv): ServiceAccount | null => {
  try {
    const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT ?? '') as ServiceAccount;
    return sa.client_email && sa.private_key ? sa : null;
  } catch { return null; }
};

const tokens = new Map<string, { token: string; until: number }>();
const googleToken = async (env: StatsEnv, sa: ServiceAccount, scope: string): Promise<string> => {
  const cached = tokens.get(scope);
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', b64Decode(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const url = env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token';
  const enc = (o: object) => b64urlEncode(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64urlEncode(sig)}` }) });
  const t = await r.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!r.ok || !t.access_token) throw new Error(`Google sign-in for the service account failed: ${t.error_description ?? r.status}`);
  tokens.set(scope, { token: t.access_token, until: Date.now() + (t.expires_in ?? 3600) * 1000 });
  return t.access_token;
};

export interface Ga4Snapshot {
  range: { from: string; to: string };
  totals: { users: number; sessions: number; views: number; keyEvents: number };
  daily: { day: string; users: number; sessions: number; views: number }[];
  pages: { path: string; views: number }[];
  channels: { name: string; sessions: number }[];
}
export interface GscSnapshot {
  range: { from: string; to: string };
  totals: { clicks: number; impressions: number };
  queries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
}

const dayAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
type Row = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };
const num = (v: string | undefined) => Number(v ?? 0) || 0;

export const isGa4Property = (s: unknown): s is string => typeof s === 'string' && /^\d{4,15}$/.test(s);
export const isSearchConsoleSite = (s: unknown): s is string =>
  typeof s === 'string' && (/^sc-domain:[a-z0-9.-]+\.[a-z]{2,}$/i.test(s) || /^https?:\/\/[^\s/]+\/$/i.test(s));

const fetchGa4 = async (env: StatsEnv, token: string, property: string): Promise<Ga4Snapshot> => {
  const base = env.GA4_API_BASE ?? 'https://analyticsdata.googleapis.com';
  const run = async (body: object): Promise<Row[]> => {
    const r = await fetch(`${base}/v1beta/properties/${property}:runReport`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json() as { rows?: Row[]; error?: { message?: string; status?: string } };
    if (!r.ok) throw new Error(r.status === 403 ? 'Google Analytics refused access. Add the service account as a Viewer on the property.' : `Google Analytics error: ${j.error?.message ?? r.status}`);
    return j.rows ?? [];
  };
  const range = [{ startDate: '28daysAgo', endDate: 'yesterday' }];
  const [daily, pages, channels, totals] = await Promise.all([
    run({ dateRanges: range, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
    run({ dateRanges: range, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 }),
    run({ dateRanges: range, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 }),
    run({ dateRanges: range, metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'keyEvents' }] }),
  ]);
  const t = totals[0]?.metricValues ?? [];
  const d = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return {
    range: { from: dayAgo(28), to: dayAgo(1) },
    totals: { users: num(t[0]?.value), sessions: num(t[1]?.value), views: num(t[2]?.value), keyEvents: num(t[3]?.value) },
    daily: daily.map((r) => ({ day: d(r.dimensionValues?.[0]?.value ?? ''), users: num(r.metricValues?.[0]?.value), sessions: num(r.metricValues?.[1]?.value), views: num(r.metricValues?.[2]?.value) })),
    pages: pages.map((r) => ({ path: (r.dimensionValues?.[0]?.value ?? '').slice(0, 200), views: num(r.metricValues?.[0]?.value) })),
    channels: channels.map((r) => ({ name: (r.dimensionValues?.[0]?.value ?? '').slice(0, 60), sessions: num(r.metricValues?.[0]?.value) })),
  };
};

const fetchGsc = async (env: StatsEnv, token: string, site: string): Promise<GscSnapshot> => {
  const base = env.GSC_API_BASE ?? 'https://www.googleapis.com';
  // Search Console data lags by a couple of days; ending 3 days ago avoids half-counted days.
  const from = dayAgo(30), to = dayAgo(3);
  const q = async (body: object) => {
    const r = await fetch(`${base}/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json() as { rows?: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[]; error?: { message?: string } };
    if (!r.ok) throw new Error(r.status === 403 ? 'Search Console refused access. Add the service account as a user on the property.' : `Search Console error: ${j.error?.message ?? r.status}`);
    return j.rows ?? [];
  };
  const [queries, totals] = await Promise.all([
    q({ startDate: from, endDate: to, dimensions: ['query'], rowLimit: 10 }),
    q({ startDate: from, endDate: to }),
  ]);
  return {
    range: { from, to },
    totals: { clicks: totals[0]?.clicks ?? 0, impressions: totals[0]?.impressions ?? 0 },
    queries: queries.map((r) => ({ query: (r.keys?.[0] ?? '').slice(0, 200), clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 0 })),
  };
};

const save = (db: DB, ws: Workspace, source: 'ga4' | 'search_console', body: unknown, error: string) =>
  error
    // Keep the last good numbers when a refresh fails; only record the error.
    ? db.prepare(`INSERT INTO stats_snapshots (workspace_id, source, body, error, fetched_at) VALUES (?, ?, 'null', ?, ?)
        ON CONFLICT (workspace_id, source) DO UPDATE SET error = excluded.error, fetched_at = excluded.fetched_at`).bind(ws.id, source, error.slice(0, 500), nowIso()).run()
    : db.prepare(`INSERT INTO stats_snapshots (workspace_id, source, body, error, fetched_at) VALUES (?, ?, ?, '', ?)
        ON CONFLICT (workspace_id, source) DO UPDATE SET body = excluded.body, error = '', fetched_at = excluded.fetched_at`).bind(ws.id, source, JSON.stringify(body), nowIso()).run();

/** Pulls fresh numbers for one workspace. Errors are stored next to the last good snapshot, never thrown. */
export const refreshStats = async (db: DB, env: StatsEnv, ws: Workspace): Promise<void> => {
  const sa = serviceAccount(env);
  if (!sa) return;
  if (isGa4Property(ws.ga4_property_id)) {
    try { await save(db, ws, 'ga4', await fetchGa4(env, await googleToken(env, sa, 'https://www.googleapis.com/auth/analytics.readonly'), ws.ga4_property_id), ''); }
    catch (e) { await save(db, ws, 'ga4', null, e instanceof Error ? e.message : String(e)); }
  }
  if (isSearchConsoleSite(ws.search_console_site)) {
    try { await save(db, ws, 'search_console', await fetchGsc(env, await googleToken(env, sa, 'https://www.googleapis.com/auth/webmasters.readonly'), ws.search_console_site), ''); }
    catch (e) { await save(db, ws, 'search_console', null, e instanceof Error ? e.message : String(e)); }
  }
};

export interface Snapshot<T> { body: T | null; error: string; fetched_at: string }
export const readStats = async (db: DB, workspaceId: string) => {
  const rows = (await db.prepare('SELECT source, body, error, fetched_at FROM stats_snapshots WHERE workspace_id = ?').bind(workspaceId).all<{ source: string; body: string; error: string; fetched_at: string }>()).results;
  const pick = <T>(s: string): Snapshot<T> | null => {
    const r = rows.find((x) => x.source === s);
    if (!r) return null;
    let body: T | null = null;
    try { body = JSON.parse(r.body) as T | null; } catch { body = null; }
    return { body, error: r.error, fetched_at: r.fetched_at };
  };
  return { ga4: pick<Ga4Snapshot>('ga4'), gsc: pick<GscSnapshot>('search_console') };
};
