// Fixed-window rate limiting backed by D1. Good enough to stop guessing and abuse at this size.

/** Returns true when the call is allowed. Counts the call either way. */
export const allow = async (db: D1Database, key: string, limit: number, windowSeconds: number): Promise<boolean> => {
  const window = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const row = await db.prepare(
    'INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 RETURNING count',
  ).bind(key, window).first<{ count: number }>();
  return (row?.count ?? 1) <= limit;
};

/** Housekeeping, run opportunistically. */
export const sweep = (db: D1Database) =>
  db.batch([
    db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(Math.floor(Date.now() / 1000) - 86400),
    db.prepare('DELETE FROM login_tokens WHERE expires_at < ?').bind(new Date(Date.now() - 86400_000).toISOString()),
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(new Date().toISOString()),
    db.prepare('DELETE FROM oauth_codes WHERE expires_at < ?').bind(new Date(Date.now() - 86400_000).toISOString()),
    db.prepare('DELETE FROM oauth_tokens WHERE expires_at < ?').bind(new Date(Date.now() - 7 * 86400_000).toISOString()),
  ]);
