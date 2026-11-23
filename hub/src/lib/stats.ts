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

export type PeriodKey = '7' | '28' | '90';
export const PERIODS: PeriodKey[] = ['7', '28', '90'];
export interface Ga4Totals { users: number; sessions: number; views: number; keyEvents: number }
export interface Ga4Period { totals: Ga4Totals; prev: Ga4Totals; pages: { path: string; views: number }[]; channels: { name: string; sessions: number; prev: number }[] }
export interface Ga4Snapshot {
  // The 28-day view the Overview reads.
  range: { from: string; to: string };
  totals: Ga4Totals;
  daily: { day: string; users: number; sessions: number; views: number }[];
  pages: { path: string; views: number }[];
  channels: { name: string; sessions: number }[];
  /** 180 days, oldest first, for the Analytics chart. Missing in snapshots saved before it existed. */
  history?: { day: string; users: number; sessions: number; views: number; keyEvents: number }[];
  /** Each period and the same length just before it, for comparisons. */
  periods?: Record<PeriodKey, Ga4Period>;
}
export interface GscQuery { query: string; clicks: number; impressions: number; ctr: number; position: number }
export interface GscPeriod {
  totals: { clicks: number; impressions: number };
  prev: { clicks: number; impressions: number };
  queries: (GscQuery & { prevClicks: number | null })[];
}
export interface GscSnapshot {
  range: { from: string; to: string };
  totals: { clicks: number; impressions: number };
  queries: GscQuery[];
  history?: { day: string; clicks: number; impressions: number }[];
  periods?: Record<PeriodKey, GscPeriod>;
}

const dayAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
type Row = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };
type Report = { dimensionHeaders?: { name?: string }[]; rows?: Row[] };
const num = (v: string | undefined) => Number(v ?? 0) || 0;

export const isGa4Property = (s: unknown): s is string => typeof s === 'string' && /^\d{4,15}$/.test(s);
export const isSearchConsoleSite = (s: unknown): s is string =>
  typeof s === 'string' && (/^sc-domain:[a-z0-9.-]+\.[a-z]{2,}$/i.test(s) || /^https?:\/\/[^\s/]+\/$/i.test(s));

/** Google Analytics counts up to yesterday. A period of n days and the n days before it. */
const ga4Range = (n: number, name: string, before = false) =>
  before ? { startDate: dayAgo(2 * n), endDate: dayAgo(n + 1), name } : { startDate: dayAgo(n), endDate: dayAgo(1), name };
/** Search Console lags a couple of days, so its periods end 3 days ago. */
const gscRange = (n: number, before = false) =>
  before ? { startDate: dayAgo(2 * n + 2), endDate: dayAgo(n + 3) } : { startDate: dayAgo(n + 2), endDate: dayAgo(3) };

const TOTALS = [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'keyEvents' }];
const toTotals = (r: Row | undefined): Ga4Totals => {
  const m = r?.metricValues ?? [];
  return { users: num(m[0]?.value), sessions: num(m[1]?.value), views: num(m[2]?.value), keyEvents: num(m[3]?.value) };
};
/** Rows of a report with several date ranges carry the range name in the "dateRange" dimension. */
const byRange = (rep: Report | undefined, range: string): Row[] => {
  const i = (rep?.dimensionHeaders ?? []).findIndex((h) => h.name === 'dateRange');
  return (rep?.rows ?? []).filter((r) => i < 0 || r.dimensionValues?.[i]?.value === range);
};
const ga4Day = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

// Two batch calls (five reports each at most), so a refresh stays well inside the Workers subrequest limit.
const fetchGa4 = async (env: StatsEnv, token: string, property: string): Promise<Ga4Snapshot> => {
  const base = env.GA4_API_BASE ?? 'https://analyticsdata.googleapis.com';
  const batch = async (requests: object[]): Promise<Report[]> => {
    const r = await fetch(`${base}/v1beta/properties/${property}:batchRunReports`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ requests }) });
    const j = await r.json() as { reports?: Report[]; error?: { message?: string } };
    if (!r.ok) throw new Error(r.status === 403 ? 'Google Analytics refused access. Add the service account as a Viewer on the property.' : `Google Analytics error: ${j.error?.message ?? r.status}`);
    return j.reports ?? [];
  };
  const [a, b] = await Promise.all([
    batch([
      { dateRanges: [{ startDate: dayAgo(180), endDate: dayAgo(1) }], dimensions: [{ name: 'date' }], metrics: TOTALS, orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
      { dateRanges: [ga4Range(7, 'c7'), ga4Range(7, 'p7', true), ga4Range(28, 'c28'), ga4Range(28, 'p28', true)], metrics: TOTALS },
      { dateRanges: [ga4Range(90, 'c90'), ga4Range(90, 'p90', true)], metrics: TOTALS },
      { dateRanges: [ga4Range(7, 'c7'), ga4Range(28, 'c28'), ga4Range(90, 'c90')], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 300 },
      { dateRanges: [ga4Range(7, 'c7'), ga4Range(7, 'p7', true), ga4Range(28, 'c28'), ga4Range(28, 'p28', true)], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: 100 },
    ]),
    batch([
      { dateRanges: [ga4Range(90, 'c90'), ga4Range(90, 'p90', true)], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], limit: 50 },
    ]),
  ]);
  const history = (a[0]?.rows ?? []).map((r) => ({ day: ga4Day(r.dimensionValues?.[0]?.value ?? ''), ...toTotals(r) }));
  const channelRows = (key: PeriodKey, range: string) => byRange(key === '90' ? b[0] : a[4], range)
    .map((r) => ({ name: (r.dimensionValues?.[0]?.value ?? '').slice(0, 60), sessions: num(r.metricValues?.[0]?.value) }));
  const period = (key: PeriodKey): Ga4Period => {
    const tot = key === '90' ? a[2] : a[1];
    const cur = channelRows(key, `c${key}`), prev = channelRows(key, `p${key}`);
    return {
      totals: toTotals(byRange(tot, `c${key}`)[0]),
      prev: toTotals(byRange(tot, `p${key}`)[0]),
      pages: byRange(a[3], `c${key}`).map((r) => ({ path: (r.dimensionValues?.[0]?.value ?? '').slice(0, 200), views: num(r.metricValues?.[0]?.value) }))
        .sort((x, y) => y.views - x.views).slice(0, 10),
      channels: cur.sort((x, y) => y.sessions - x.sessions).slice(0, 8)
        .map((c) => ({ ...c, prev: prev.find((p) => p.name === c.name)?.sessions ?? 0 })),
    };
  };
  const periods = { '7': period('7'), '28': period('28'), '90': period('90') };
  return {
    range: { from: dayAgo(28), to: dayAgo(1) },
    totals: periods['28'].totals,
    daily: history.slice(-28).map(({ day, users, sessions, views }) => ({ day, users, sessions, views })),
    pages: periods['28'].pages,
    channels: periods['28'].channels.map(({ name, sessions }) => ({ name, sessions })),
    history,
    periods,
  };
};

const fetchGsc = async (env: StatsEnv, token: string, site: string): Promise<GscSnapshot> => {
  const base = env.GSC_API_BASE ?? 'https://www.googleapis.com';
  type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
  const q = async (body: object): Promise<GscRow[]> => {
    const r = await fetch(`${base}/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json() as { rows?: GscRow[]; error?: { message?: string } };
    if (!r.ok) throw new Error(r.status === 403 ? 'Search Console refused access. Add the service account as a user on the property.' : `Search Console error: ${j.error?.message ?? r.status}`);
    return j.rows ?? [];
  };
  const queries = (range: { startDate: string; endDate: string }, rowLimit: number) => q({ ...range, dimensions: ['query'], rowLimit });
  // Daily totals give every period's sums, so only the search terms need their own calls.
  const [days, ...qs] = await Promise.all([
    q({ startDate: dayAgo(182), endDate: dayAgo(3), dimensions: ['date'], rowLimit: 400 }),
    ...PERIODS.flatMap((k) => [queries(gscRange(Number(k)), 10), queries(gscRange(Number(k), true), 100)]),
  ]);
  const history = days.map((r) => ({ day: r.keys?.[0] ?? '', clicks: r.clicks ?? 0, impressions: r.impressions ?? 0 })).sort((x, y) => x.day.localeCompare(y.day));
  const sum = (range: { startDate: string; endDate: string }) => history.filter((d) => d.day >= range.startDate && d.day <= range.endDate)
    .reduce((t, d) => ({ clicks: t.clicks + d.clicks, impressions: t.impressions + d.impressions }), { clicks: 0, impressions: 0 });
  const toQuery = (r: GscRow): GscQuery => ({ query: (r.keys?.[0] ?? '').slice(0, 200), clicks: r.clicks ?? 0, impressions: r.impressions ?? 0, ctr: r.ctr ?? 0, position: r.position ?? 0 });
  const period = (k: PeriodKey, i: number): GscPeriod => {
    const prev = (qs[i * 2 + 1] ?? []).map(toQuery);
    return {
      totals: sum(gscRange(Number(k))),
      prev: sum(gscRange(Number(k), true)),
      queries: (qs[i * 2] ?? []).map(toQuery).map((x) => ({ ...x, prevClicks: prev.find((p) => p.query === x.query)?.clicks ?? null })),
    };
  };
  const periods = { '7': period('7', 0), '28': period('28', 1), '90': period('90', 2) };
  const r28 = gscRange(28);
  return { range: { from: r28.startDate, to: r28.endDate }, totals: periods['28'].totals, queries: periods['28'].queries.map(({ prevClicks: _, ...x }) => x), history, periods };
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

/** Workspaces with Google set up whose numbers are older than a day, oldest first. The cron takes a few per run. */
export const staleWorkspaces = async (db: DB, limit: number): Promise<Workspace[]> =>
  (await db.prepare(`SELECT w.* FROM workspaces w LEFT JOIN (SELECT workspace_id, MIN(fetched_at) AS at FROM stats_snapshots GROUP BY workspace_id) s ON s.workspace_id = w.id
    WHERE (w.ga4_property_id != '' OR w.search_console_site != '') AND (s.at IS NULL OR s.at < ?) ORDER BY COALESCE(s.at, '') LIMIT ?`)
    .bind(new Date(Date.now() - 20 * 3_600_000).toISOString(), limit).all<Workspace>()).results;

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
