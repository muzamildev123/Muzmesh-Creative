// The scheduler: every few minutes it posts approved posts whose moment has come.
// Runs from the Worker's cron trigger (src/worker.ts) and from "Post now".
import { getAsset, POSTABLE } from './assets';
import { sendMail, type MailEnv } from './email';
import { trackLinks } from './links';
import * as repo from './repo';
import { readImage } from './service';
import { accessTokenFor, getAccount, markReconnect, NETWORK_NAMES, publishTo, PublishError, type OutgoingImage, type SocialEnv } from './social';
import type { Post, Workspace } from './types';
import { formatDay, nowIso } from './util';

type DB = D1Database;
export interface PublisherEnv extends SocialEnv, MailEnv { FILES?: R2Bucket; APP_ORIGIN?: string }

export const MAX_ATTEMPTS = 5;
const CLAIM_MINUTES = 10;
// Waits between tries after a temporary failure: 5, 15, 30 and 60 minutes.
const BACKOFF_MIN = [5, 15, 30, 60];

const minutesAgo = (n: number, from = Date.now()) => new Date(from - n * 60_000).toISOString();

/** Takes the post for this run. Fails if another run has it, so a post cannot go out twice. */
const claim = async (db: DB, post: Post, now: string): Promise<boolean> => {
  const r = await db.prepare(`UPDATE posts SET publish_claimed_at = ?, publish_attempts = publish_attempts + 1
    WHERE id = ? AND status = 'approved' AND (publish_claimed_at IS NULL OR publish_claimed_at < ?)`)
    .bind(now, post.id, minutesAgo(CLAIM_MINUTES, Date.parse(now))).run();
  return (r.meta.changes ?? 0) > 0;
};

const imageFor = async (db: DB, env: PublisherEnv, post: Post): Promise<OutgoingImage | null> => {
  const template = readImage(post.image);
  const id = post.asset_id ?? (template ? post.render_asset_id : null);
  if (!id) return null;
  if (!post.asset_id && post.image_rendered !== post.image) throw new PublishError('fatal', 'The post image changed and has not been redrawn. Open the post in Launch Room once, then try again.');
  const a = await getAsset(db, post.workspace_id, id);
  if (!a || !POSTABLE.has(a.content_type)) throw new PublishError('fatal', 'The post image is missing from the library.');
  const obj = await env.FILES?.get(a.r2_key);
  if (!obj) throw new PublishError('fatal', 'The post image file could not be read from storage.');
  const alt = a.alt || (template ? [template.kicker, template.headline, template.sub].filter(Boolean).join('. ') : '');
  return { bytes: await obj.arrayBuffer(), contentType: a.content_type, alt };
};

const alert = async (db: DB, env: PublisherEnv, ws: Workspace, post: Post, message: string) => {
  const rows = (await db.prepare(`SELECT DISTINCT u.email FROM users u LEFT JOIN memberships m ON m.user_id = u.id AND m.workspace_id = ?
    WHERE (m.role = 'owner') OR u.id = ?`).bind(ws.id, post.created_by ?? '').all<{ email: string }>()).results;
  const origin = env.APP_ORIGIN ?? '';
  await sendMail(env, rows.map((r) => r.email), `A ${NETWORK_NAMES[post.channel]} post for ${ws.name} did not go out`,
    `The post planned for ${formatDay(post.scheduled_for)} ${post.scheduled_time ?? ''} could not be published.\n\n${message}\n\n${origin ? `Open it: ${origin}/w/${ws.slug}/posts/${post.id}\n\n` : ''}Nothing was posted. Fix the problem and use "Post now", or publish it by hand.`);
};

export type Outcome = { id: string; result: 'published' | 'retry' | 'failed' | 'skipped'; message?: string; url?: string };

/** Publishes one post that this run has claimed. Never throws. */
const publishClaimed = async (db: DB, env: PublisherEnv, ws: Workspace, post: Post, origin: string): Promise<Outcome> => {
  const attempt = post.publish_attempts + 1;
  try {
    if (!post.social_account_id) throw new PublishError('fatal', 'No account is chosen for this post.');
    const acc = await getAccount(db, ws.id, post.social_account_id);
    if (!acc) throw new PublishError('fatal', 'The account for this post was disconnected.');
    if (acc.network !== post.channel) throw new PublishError('fatal', 'The account is on a different network than the post.');
    const token = await accessTokenFor(db, env, acc);
    const image = await imageFor(db, env, post);
    const text = origin ? await trackLinks(db, ws.id, post.id, post.copy, origin) : post.copy;
    const out = await publishTo(env, acc, token, text, image);
    await repo.setPostStatus(db, ws.id, post.id, 'approved', 'published', { published_url: out.url, external_id: out.externalId });
    await repo.logActivity(db, ws.id, 'post', post.id, 'auto_published', null, 'hub', out.url);
    return { id: post.id, result: 'published', url: out.url };
  } catch (e) {
    const err = e instanceof PublishError ? e : new PublishError('retry', 'Something went wrong while posting.');
    if (!(e instanceof PublishError)) console.error('publish failed', post.id, e);
    if (err.kind === 'auth' && post.social_account_id) await markReconnect(db, post.social_account_id, err.message);
    const giveUp = err.kind !== 'retry' || attempt >= MAX_ATTEMPTS;
    if (giveUp) {
      // Stop trying: no claim to expire, attempts at the limit, and the error shown on the post.
      await db.prepare('UPDATE posts SET publish_error = ?, publish_attempts = ?, publish_claimed_at = NULL WHERE id = ?').bind(err.message.slice(0, 600), MAX_ATTEMPTS, post.id).run();
      await repo.logActivity(db, ws.id, 'post', post.id, 'publish_failed', null, 'hub', err.message);
      await alert(db, env, ws, post, err.message).catch((x) => console.error('alert failed', x));
      return { id: post.id, result: 'failed', message: err.message };
    }
    // Hold the claim until the next try is due, so earlier runs leave it alone.
    const wait = BACKOFF_MIN[Math.min(attempt - 1, BACKOFF_MIN.length - 1)]!;
    await db.prepare('UPDATE posts SET publish_error = ?, publish_claimed_at = ? WHERE id = ?')
      .bind(err.message.slice(0, 600), new Date(Date.now() + (wait - CLAIM_MINUTES) * 60_000).toISOString(), post.id).run();
    return { id: post.id, result: 'retry', message: err.message };
  }
};

/** One scheduler run: up to `limit` due posts across all workspaces. */
export const runDuePosts = async (db: DB, env: PublisherEnv, origin: string, now = nowIso(), limit = 20): Promise<Outcome[]> => {
  const due = (await db.prepare(`SELECT * FROM posts WHERE status = 'approved' AND social_account_id IS NOT NULL AND publish_at IS NOT NULL AND publish_at <= ?
    AND publish_attempts < ? AND (publish_claimed_at IS NULL OR publish_claimed_at < ?) ORDER BY publish_at LIMIT ?`)
    .bind(now, MAX_ATTEMPTS, minutesAgo(CLAIM_MINUTES, Date.parse(now)), limit).all<Post>()).results;
  const out: Outcome[] = [];
  const wsCache = new Map<string, Workspace | null>();
  for (const post of due) {
    if (!(await claim(db, post, now))) { out.push({ id: post.id, result: 'skipped' }); continue; }
    if (!wsCache.has(post.workspace_id)) wsCache.set(post.workspace_id, await repo.getWorkspaceById(db, post.workspace_id));
    const ws = wsCache.get(post.workspace_id);
    if (!ws) continue;
    out.push(await publishClaimed(db, env, ws, post, origin));
  }
  return out;
};

/** "Post now": moves the moment to now and runs it straight away. */
export const publishNow = async (db: DB, env: PublisherEnv, ws: Workspace, postId: string, origin: string): Promise<Outcome> => {
  const now = nowIso();
  await repo.setPublishAt(db, ws.id, postId, now);
  const post = await repo.getPost(db, ws.id, postId);
  if (!post || post.status !== 'approved' || !post.social_account_id) return { id: postId, result: 'skipped', message: 'Only approved posts with an account can be posted.' };
  if (!(await claim(db, post, now))) return { id: postId, result: 'skipped', message: 'It is already being posted.' };
  return publishClaimed(db, env, ws, post, origin);
};
