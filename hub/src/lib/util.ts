// Small helpers shared by server code. Only Web APIs, so it runs on Workers and in Node tests.

export const nowIso = (d: Date = new Date()): string => d.toISOString();
export const newId = (): string => crypto.randomUUID();

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** 256 bits of randomness, URL-safe. Used for sign-in links, sessions and OAuth tokens. */
export const randomToken = (): string => b64url(crypto.getRandomValues(new Uint8Array(32)));

export const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** base64url(SHA-256(input)): the PKCE S256 transform. */
export const sha256B64Url = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return b64url(new Uint8Array(digest));
};

/** Compare two strings without leaking where they differ. */
export const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const addSeconds = (seconds: number, from: Date = new Date()): string =>
  new Date(from.getTime() + seconds * 1000).toISOString();

export const isDay = (s: unknown): s is string => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
export const isMonth = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export const today = (d: Date = new Date()): string => d.toISOString().slice(0, 10);
export const thisMonth = (d: Date = new Date()): string => d.toISOString().slice(0, 7);

/** First day of the month and first day of the next one, for half-open date ranges. */
export const monthRange = (month: string): { from: string; to: string } => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { from: `${month}-01`, to: `${next}-01` };
};
export const shiftMonth = (month: string, by: number): string => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};

/** "1 h 20 m" */
export const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} m`;
  if (h) return `${h} h`;
  return `${m} m`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "13 Nov 2026" from a YYYY-MM-DD or ISO string. */
export const formatDay = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
export const formatMonth = (month: string): string => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${full[m - 1]} ${y}`;
};

/** Accept only http(s) links. Returns '' for anything else, so javascript: and data: never reach an href. */
export const safeUrl = (raw: unknown, { httpsOnly = false } = {}): string => {
  if (typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s || s.length > 2000) return '';
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' || (!httpsOnly && u.protocol === 'http:')) return u.toString();
  } catch { /* not a URL */ }
  return '';
};

export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export const clampText = (v: unknown, max: number): string =>
  (typeof v === 'string' ? v : '').replace(/\r\n/g, '\n').trim().slice(0, max);
