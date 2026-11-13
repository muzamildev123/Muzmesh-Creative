// Short links put into posts so clicks can be counted on every network, with no API approval needed.
import { nowIso, today } from './util';

type DB = D1Database;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = (len = 7): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
};
export const isCode = (s: unknown): s is string => typeof s === 'string' && /^[a-zA-Z0-9]{5,12}$/.test(s);

// Links in post text: http(s) up to whitespace, minus trailing punctuation.
const URL_RE = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'’”]/g;

/**
 * Swaps each link in the text for a short link to the same place, reusing one per post and target.
 * Links that already point at the short-link host are left alone.
 */
export const trackLinks = async (db: DB, workspaceId: string, postId: string, text: string, base: string): Promise<string> => {
  const matches = [...new Set(text.match(URL_RE) ?? [])].filter((u) => !u.startsWith(`${base}/l/`));
  let out = text;
  for (const target of matches) {
    let code = (await db.prepare('SELECT code FROM short_links WHERE workspace_id = ? AND post_id = ? AND target_url = ?')
      .bind(workspaceId, postId, target).first<{ code: string }>())?.code;
    if (!code) {
      code = newCode();
      await db.prepare('INSERT INTO short_links (code, workspace_id, post_id, target_url, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(code, workspaceId, postId, target, nowIso()).run();
    }
    out = out.split(target).join(`${base}/l/${code}`);
  }
  return out;
};

export const linkTarget = (db: DB, code: string) =>
  db.prepare('SELECT code, workspace_id, target_url FROM short_links WHERE code = ?').bind(code).first<{ code: string; workspace_id: string; target_url: string }>();

const BOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|embedly|quora link|whatsapp|skypeuripreview|vkshare|headless/i;
export const isBot = (ua: string | null): boolean => !ua || BOT.test(ua);

export const countClick = (db: DB, link: { code: string; workspace_id: string }) =>
  db.prepare('INSERT INTO link_clicks (code, workspace_id, day, clicks) VALUES (?, ?, ?, 1) ON CONFLICT (code, day) DO UPDATE SET clicks = clicks + 1').bind(link.code, link.workspace_id, today()).run();

export interface PostClicks { post_id: string; clicks: number }
/** Clicks per post since a day (inclusive). */
export const clicksByPost = async (db: DB, workspaceId: string, since: string): Promise<Map<string, number>> => {
  const rows = (await db.prepare(`SELECT s.post_id, COALESCE(SUM(c.clicks), 0) AS clicks FROM short_links s
    LEFT JOIN link_clicks c ON c.code = s.code AND c.day >= ? WHERE s.workspace_id = ? AND s.post_id IS NOT NULL GROUP BY s.post_id`)
    .bind(since, workspaceId).all<PostClicks>()).results;
  return new Map(rows.map((r) => [r.post_id, r.clicks]));
};
export const totalClicks = async (db: DB, workspaceId: string, since: string): Promise<number> =>
  (await db.prepare('SELECT COALESCE(SUM(clicks), 0) AS n FROM link_clicks WHERE workspace_id = ? AND day >= ?')
    .bind(workspaceId, since).first<{ n: number }>())?.n ?? 0;
