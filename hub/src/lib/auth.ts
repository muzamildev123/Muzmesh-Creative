// Sign-in by emailed link, and cookie sessions. No passwords to leak or reset.
// Only hashes of link tokens and session ids are stored, so a database leak cannot be replayed.
import * as repo from './repo';
import type { User } from './types';
import { addSeconds, nowIso, randomToken, sha256Hex } from './util';

type DB = D1Database;
export const LOGIN_LINK_SECONDS = 15 * 60;
export const SESSION_SECONDS = 30 * 24 * 60 * 60;

export const isEmail = (s: string): boolean => s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * Finds the user for a sign-in request. Accounts are invite-only: unknown addresses get nothing.
 * The one exception is the very first sign-in, which may create the first MuzMesh staff account.
 */
export const userForLogin = async (db: DB, email: string, bootstrapEmail: string | undefined): Promise<User | null> => {
  const existing = await repo.getUserByEmail(db, email);
  if (existing) return existing;
  const boot = bootstrapEmail?.trim().toLowerCase();
  if (boot && boot === email.trim().toLowerCase() && (await repo.countUsers(db)) === 0) {
    return repo.createUser(db, email, '', true);
  }
  return null;
};

export const createLoginToken = async (db: DB, userId: string): Promise<string> => {
  const token = randomToken();
  await db.prepare('INSERT INTO login_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256Hex(token), userId, addSeconds(LOGIN_LINK_SECONDS)).run();
  return token;
};

export const loginTokenIsLive = async (db: DB, token: string): Promise<boolean> => {
  const row = await db.prepare('SELECT 1 AS x FROM login_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .bind(await sha256Hex(token), nowIso()).first();
  return !!row;
};

/** Uses a sign-in link exactly once and returns a new session id, or null. */
export const consumeLoginToken = async (db: DB, token: string): Promise<{ sessionId: string; user: User } | null> => {
  const t = nowIso();
  // Single statement: only one request can flip used_at, even if the link is opened twice at once.
  const row = await db.prepare('UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id')
    .bind(t, await sha256Hex(token), t).first<{ user_id: string }>();
  if (!row) return null;
  const user = await repo.getUserById(db, row.user_id);
  if (!user) return null;
  const sessionId = randomToken();
  await db.prepare('INSERT INTO sessions (id_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(sessionId), user.id, addSeconds(SESSION_SECONDS), t).run();
  return { sessionId, user };
};

export const userForSession = async (db: DB, sessionId: string | undefined): Promise<User | null> => {
  if (!sessionId || sessionId.length > 200) return null;
  return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ?')
    .bind(await sha256Hex(sessionId), nowIso()).first<User>();
};

export const endSession = async (db: DB, sessionId: string | undefined) => {
  if (sessionId) await db.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256Hex(sessionId)).run();
};

/** Only same-site paths are allowed as a post-login destination. */
export const safeNext = (next: unknown): string => {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || next.length > 1500) return '/';
  return next;
};
