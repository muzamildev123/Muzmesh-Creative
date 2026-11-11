import { homeDefaults, type HomeContent } from '@/data/home';
import { sanityClient } from '@/lib/sanity';

// The Homepage is one fixed document in Sanity (_id "homePage").
const query = `*[_id == "homePage"][0]`;

type Plain = Record<string, unknown>;
const isObj = (v: unknown): v is Plain => !!v && typeof v === 'object' && !Array.isArray(v);

// Sanity fills in on top of the defaults: an empty field keeps the default, so a
// half-filled document never leaves a blank on the page.
function merge<T>(base: T, over: unknown): T {
  if (over === null || over === undefined) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(over) || !over.length) return base;
    // A list from Sanity replaces the whole default list. Each item is shaped
    // like the first default item, so a field left empty is blank, never null.
    return over.map((item) => (isObj(base[0]) ? shape(base[0], item) : item)).filter((x) => x != null) as T;
  }
  if (isObj(base)) {
    if (!isObj(over)) return base;
    const out: Plain = { ...base };
    for (const k of Object.keys(base)) out[k] = merge((base as Plain)[k], over[k]);
    return out as T;
  }
  if (typeof base === 'string') return (typeof over === 'string' && over.trim() ? over : base) as T;
  if (typeof base === 'number') return (typeof over === 'number' && Number.isFinite(over) ? over : base) as T;
  return over as T;
}

// An item from a Sanity list, shaped like `like`: missing text becomes '', and
// extra fields (such as an FAQ answer's optional list) are kept without nulls.
function shape(like: Plain, item: unknown): Plain {
  const src = isObj(item) ? item : {};
  const out: Plain = {};
  for (const [k, v] of Object.entries(src)) if (v !== null && !k.startsWith('_')) out[k] = isObj(v) ? shape({}, v) : Array.isArray(v) ? v.filter((x) => x != null).map((x) => (isObj(x) ? shape({}, x) : x)) : v;
  for (const [k, v] of Object.entries(like)) {
    const o = src[k];
    if (typeof v === 'string') out[k] = typeof o === 'string' ? o : '';
    else if (Array.isArray(v)) out[k] = Array.isArray(o) ? o.filter((x) => x != null).map((x) => (isObj(v[0]) ? shape(v[0], x) : x)) : [];
    else if (isObj(v)) out[k] = shape(v, o);
  }
  return out;
}

export async function getHome(): Promise<HomeContent> {
  if (!import.meta.env.SANITY_PROJECT_ID) {
    if (!import.meta.env.DEV) throw new Error('SANITY_PROJECT_ID is not set (see README).');
    return homeDefaults;
  }
  const doc = await sanityClient().fetch<Plain | null>(query);
  if (!doc) console.warn('[home] No Homepage document in Sanity yet, using the defaults. Run `npm run seed:home` in studio/.');
  return mergeHome(doc);
}

/** The defaults with a Homepage document from Sanity laid over them. */
export const mergeHome = (doc: unknown): HomeContent => merge(homeDefaults, doc);

// ---------- text helpers ----------

const money = (n: number) => '$' + n.toLocaleString('en-US');

export function tokens(c: HomeContent) {
  const { setup, monthly, referralPercent } = c.prices;
  return {
    setup: money(setup),
    monthly: money(monthly),
    percent: referralPercent + '%',
    referred: money(Math.round(monthly * (1 - referralPercent / 100))),
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (s: string, t: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => t[k] ?? m);

/** Editor text to HTML: escapes it, fills {tokens}, and turns **bold** and `code` into tags. */
export function rich(s: string, t: Record<string, string>) {
  return fill(esc(s), t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

/** Editor text as plain text, for meta tags and structured data. */
export function plain(s: string, t: Record<string, string>) {
  return fill(s, t).replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1');
}
