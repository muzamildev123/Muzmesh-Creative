// Every change to client data goes through here: hub pages and MCP tools call the same functions,
// so permissions, the brand check and the activity log cannot be skipped by either door.
import { can } from './authz';
import { bannedPhrases, readBrand } from './brand';
import { checkCopy, hasErrors, type Channel, type Issue } from './brand-check';
import { approvedFactsText, CONTEXT_FIELDS, CONTEXT_FIELD_MAX, readContext, type ContextPack } from './context';
import * as repo from './repo';
import { fail, ok, type Actor, type Post, type PostImage, type RequestStatus, type Result, type Workspace, type WorkRequest } from './types';
import { POSTABLE } from './assets';
import { isTime, zonedToUtc } from './time';
import { clampText, isDay, safeUrl, today } from './util';

type DB = D1Database;

export const COPY_MAX = 5000;
export const IMAGE_TEMPLATES = ['announcement', 'quote', 'stat', 'changelog'] as const;
const isChannel = (v: unknown): v is Channel => v === 'linkedin' || v === 'x';

/** Cleans image template fields. Returns '{}' when there is no usable image. */
export const cleanImage = (raw: unknown): string => {
  let o: Record<string, unknown> = {};
  if (typeof raw === 'string') { try { o = JSON.parse(raw) as Record<string, unknown>; } catch { o = {}; } }
  else if (raw && typeof raw === 'object') o = raw as Record<string, unknown>;
  const template = IMAGE_TEMPLATES.find((t) => t === o.template);
  const headline = clampText(o.headline, 160);
  if (!template || !headline) return '{}';
  const image: PostImage = {
    template, theme: o.theme === 'dark' ? 'dark' : 'light',
    kicker: clampText(o.kicker, 40), headline, sub: clampText(o.sub, 220),
  };
  return JSON.stringify(image);
};
export const readImage = (raw: string): PostImage | null => {
  try { const o = JSON.parse(raw) as PostImage; return o && o.template && o.headline ? o : null; } catch { return null; }
};

export const checkRulesFor = async (db: DB, ws: Workspace) => {
  const ctx = await repo.latestContext(db, ws.id);
  return { banned: bannedPhrases(readBrand(ws.brand_config)), approvedFacts: approvedFactsText(readContext(ctx?.body)) };
};

export const checkPostCopy = async (db: DB, ws: Workspace, channel: Channel, copy: string): Promise<Issue[]> =>
  checkCopy(copy, channel, await checkRulesFor(db, ws));

// ---------- posts ----------
export interface PostInput { channel?: unknown; copy?: unknown; image?: unknown; scheduled_for?: unknown; scheduled_time?: unknown; social_account_id?: unknown; asset_id?: unknown }

const parsePostInput = async (db: DB, ws: Workspace, input: PostInput, base?: Post): Promise<Result<repo.PostFields>> => {
  const channel = input.channel === undefined && base ? base.channel : input.channel;
  if (!isChannel(channel)) return fail(400, 'Choose LinkedIn or X.');
  const copy = input.copy === undefined && base ? base.copy : clampText(input.copy, COPY_MAX + 1);
  if (copy.length > COPY_MAX) return fail(400, `Post text is too long (over ${COPY_MAX} characters).`);
  let day: string | null = base?.scheduled_for ?? null;
  if (input.scheduled_for !== undefined) {
    if (input.scheduled_for === null || input.scheduled_for === '') day = null;
    else if (isDay(input.scheduled_for)) day = input.scheduled_for;
    else return fail(400, 'The date must look like 2026-11-30.');
  }
  let time: string | null = base?.scheduled_time ?? null;
  if (input.scheduled_time !== undefined) {
    if (input.scheduled_time === null || input.scheduled_time === '') time = null;
    else if (isTime(input.scheduled_time)) time = input.scheduled_time;
    else return fail(400, 'The time must look like 09:30.');
  }
  const image = input.image === undefined && base ? base.image : cleanImage(input.image);

  let account: string | null = base?.social_account_id ?? null;
  if (input.social_account_id !== undefined) account = typeof input.social_account_id === 'string' && input.social_account_id ? input.social_account_id : null;
  if (account) {
    const acc = await db.prepare('SELECT network FROM social_accounts WHERE workspace_id = ? AND id = ?').bind(ws.id, account).first<{ network: string }>();
    if (!acc) return fail(400, 'That account is not connected to this workspace.');
    if (acc.network !== channel) return fail(400, `That account is on ${acc.network === 'x' ? 'X' : 'LinkedIn'}, but this post is for ${channel === 'x' ? 'X' : 'LinkedIn'}.`);
    if (!day || !time) return fail(400, 'Pick a date and a time so it knows when to post.');
  }
  let asset: string | null = base?.asset_id ?? null;
  if (input.asset_id !== undefined) asset = typeof input.asset_id === 'string' && input.asset_id ? input.asset_id : null;
  if (asset) {
    const a = await db.prepare('SELECT content_type FROM assets WHERE workspace_id = ? AND id = ?').bind(ws.id, asset).first<{ content_type: string }>();
    if (!a) return fail(400, 'That image is not in this workspace\'s library.');
    if (!POSTABLE.has(a.content_type)) return fail(400, 'Only PNG, JPG, GIF or WebP images can go on a post.');
  }
  const publish_at = day && time ? zonedToUtc(day, time, ws.timezone || 'UTC') : null;
  return ok({ channel, copy, image, scheduled_for: day, scheduled_time: time, publish_at, social_account_id: account, asset_id: asset });
};

export const createPost = async (db: DB, ws: Workspace, actor: Actor, input: PostInput): Promise<Result<{ post: Post; issues: Issue[] }>> => {
  if (!can(actor, 'post.write')) return fail(403, 'Your role cannot create posts.');
  const fields = await parsePostInput(db, ws, input);
  if (!fields.ok) return fields;
  const post = await repo.insertPost(db, ws.id, fields.value, actor.userId, actor.via);
  await repo.logActivity(db, ws.id, 'post', post.id, 'created', actor.userId, actor.via);
  return ok({ post, issues: await checkPostCopy(db, ws, post.channel, post.copy) });
};

/** Editing a post that was in review or approved sends it back to draft, so an approval always covers the exact text that goes out. */
export const updatePost = async (db: DB, ws: Workspace, actor: Actor, id: string, input: PostInput): Promise<Result<{ post: Post; issues: Issue[]; movedToDraft: boolean }>> => {
  if (!can(actor, 'post.write')) return fail(403, 'Your role cannot edit posts.');
  const current = await repo.getPost(db, ws.id, id);
  if (!current) return fail(404, 'Post not found.');
  if (current.status === 'published') return fail(409, 'Published posts cannot be edited.');
  const fields = await parsePostInput(db, ws, input, current);
  if (!fields.ok) return fields;
  const f = fields.value;
  // Anything that changes what goes out, or where, needs a fresh approval. Removing the account
  // (back to publishing by hand) or moving the date does not.
  const contentChanged = f.copy !== current.copy || f.channel !== current.channel || f.image !== current.image || f.asset_id !== current.asset_id
    || (f.social_account_id !== null && f.social_account_id !== current.social_account_id);
  const movedToDraft = contentChanged && current.status !== 'draft';
  const status = movedToDraft ? 'draft' : current.status;
  await repo.updatePostFields(db, ws.id, id, f, status);
  if (contentChanged) await repo.logActivity(db, ws.id, 'post', id, movedToDraft ? 'edited_back_to_draft' : 'edited', actor.userId, actor.via);
  else if (f.publish_at !== current.publish_at || f.scheduled_for !== current.scheduled_for) await repo.logActivity(db, ws.id, 'post', id, 'rescheduled', actor.userId, actor.via, [f.scheduled_for ?? 'no date', f.scheduled_time ?? ''].join(' ').trim());
  else if (f.social_account_id !== current.social_account_id) await repo.logActivity(db, ws.id, 'post', id, 'auto_post_off', actor.userId, actor.via);
  const post = { ...current, ...f, status } as Post;
  return ok({ post, issues: await checkPostCopy(db, ws, post.channel, post.copy), movedToDraft });
};

export const submitPost = async (db: DB, ws: Workspace, actor: Actor, id: string): Promise<Result<Post>> => {
  if (!can(actor, 'post.write')) return fail(403, 'Your role cannot send posts for review.');
  const post = await repo.getPost(db, ws.id, id);
  if (!post) return fail(404, 'Post not found.');
  if (post.status !== 'draft') return fail(409, 'Only drafts can be sent for review.');
  const issues = await checkPostCopy(db, ws, post.channel, post.copy);
  if (hasErrors(issues)) return fail(400, `Fix these first: ${issues.filter((i) => i.level === 'error').map((i) => i.message).join(' ')}`);
  if (!(await repo.setPostStatus(db, ws.id, id, 'draft', 'in_review'))) return fail(409, 'This post changed in the meantime. Reload and try again.');
  await repo.logActivity(db, ws.id, 'post', id, 'sent_for_review', actor.userId, actor.via);
  return ok({ ...post, status: 'in_review' });
};

// Approval is a human decision. It is deliberately not available to the connector (see src/lib/mcp.ts).
export const reviewPost = async (db: DB, ws: Workspace, actor: Actor, id: string, decision: 'approve' | 'changes', note = ''): Promise<Result<Post>> => {
  if (actor.via !== 'hub') return fail(403, 'Posts can only be approved by a person in Launch Room.');
  if (!can(actor, 'post.approve')) return fail(403, 'Only a workspace owner or MuzMesh can approve posts.');
  const post = await repo.getPost(db, ws.id, id);
  if (!post) return fail(404, 'Post not found.');
  if (post.status !== 'in_review') return fail(409, 'This post is not waiting for review.');
  const cleanNote = clampText(note, 1000);
  if (decision === 'changes' && !cleanNote) return fail(400, 'Say what should change.');
  if (decision === 'approve') {
    // Re-check at approval time: the avoid list or the facts may have changed since it was sent.
    const issues = await checkPostCopy(db, ws, post.channel, post.copy);
    if (hasErrors(issues)) return fail(400, `This post no longer passes the brand check: ${issues.filter((i) => i.level === 'error').map((i) => i.message).join(' ')}`);
    if (post.social_account_id && readImage(post.image) && !post.asset_id && post.image_rendered !== post.image) {
      return fail(409, 'The post image is still being prepared. Wait a moment and approve again.');
    }
  }
  const to = decision === 'approve' ? 'approved' : 'draft';
  if (!(await repo.setPostStatus(db, ws.id, id, 'in_review', to))) return fail(409, 'This post changed in the meantime. Reload and try again.');
  await repo.logActivity(db, ws.id, 'post', id, decision === 'approve' ? 'approved' : 'changes_requested', actor.userId, actor.via, cleanNote);
  return ok({ ...post, status: to });
};

export const markPublished = async (db: DB, ws: Workspace, actor: Actor, id: string, url: unknown): Promise<Result<Post>> => {
  if (actor.via !== 'hub') return fail(403, 'Posts are marked as published in Launch Room.');
  if (!can(actor, 'post.write')) return fail(403, 'Your role cannot publish posts.');
  const post = await repo.getPost(db, ws.id, id);
  if (!post) return fail(404, 'Post not found.');
  if (post.status !== 'approved') return fail(409, 'Only approved posts can be marked as published.');
  const link = safeUrl(url, { httpsOnly: true });
  if (!link) return fail(400, 'Paste the link to the live post (it starts with https://).');
  const day = post.scheduled_for ?? today();
  if (!post.scheduled_for) await repo.setPostDate(db, ws.id, id, day);
  if (!(await repo.setPostStatus(db, ws.id, id, 'approved', 'published', { published_url: link }))) return fail(409, 'This post changed in the meantime. Reload and try again.');
  await repo.logActivity(db, ws.id, 'post', id, 'published', actor.userId, actor.via, link);
  return ok({ ...post, status: 'published', published_url: link, scheduled_for: day });
};

export const deleteDraft = async (db: DB, ws: Workspace, actor: Actor, id: string): Promise<Result<true>> => {
  if (actor.via !== 'hub') return fail(403, 'Posts are deleted in Launch Room.');
  if (!can(actor, 'post.write')) return fail(403, 'Your role cannot delete posts.');
  const post = await repo.getPost(db, ws.id, id);
  if (!post) return fail(404, 'Post not found.');
  if (post.status !== 'draft') return fail(409, 'Only drafts can be deleted.');
  return (await repo.deletePost(db, ws.id, id)) ? ok(true) : fail(409, 'This post changed in the meantime. Reload and try again.');
};

// ---------- requests ----------
export const createRequest = async (db: DB, ws: Workspace, actor: Actor, input: { title?: unknown; detail?: unknown; page_url?: unknown }): Promise<Result<WorkRequest>> => {
  if (!can(actor, 'request.create')) return fail(403, 'Your role cannot send requests.');
  const title = clampText(input.title, 140);
  if (title.length < 3) return fail(400, 'Give the request a short title.');
  const rawUrl = clampText(input.page_url, 2000);
  const page_url = safeUrl(rawUrl);
  if (rawUrl && !page_url) return fail(400, 'The page link must start with http:// or https://.');
  const req = await repo.insertRequest(db, ws.id, { title, detail: clampText(input.detail, 4000), page_url }, actor.userId, actor.via);
  await repo.logActivity(db, ws.id, 'request', req.id, 'created', actor.userId, actor.via);
  return ok(req);
};

const REQUEST_STATUSES: RequestStatus[] = ['open', 'in_progress', 'done', 'declined'];
export const changeRequestStatus = async (db: DB, ws: Workspace, actor: Actor, id: string, status: unknown): Promise<Result<true>> => {
  if (actor.via !== 'hub' || !can(actor, 'request.manage')) return fail(403, 'Only MuzMesh can change a request\'s status.');
  if (!REQUEST_STATUSES.includes(status as RequestStatus)) return fail(400, 'Unknown status.');
  const req = await repo.getRequest(db, ws.id, id);
  if (!req) return fail(404, 'Request not found.');
  if (req.status === status) return ok(true);
  await repo.setRequestStatus(db, ws.id, id, status as RequestStatus);
  await repo.logActivity(db, ws.id, 'request', id, `status_${status as string}`, actor.userId, actor.via);
  return ok(true);
};

export const logTime = async (db: DB, ws: Workspace, actor: Actor, requestId: string, input: { minutes?: unknown; note?: unknown; logged_on?: unknown }): Promise<Result<true>> => {
  if (actor.via !== 'hub' || !can(actor, 'request.manage')) return fail(403, 'Only MuzMesh can log time.');
  const req = await repo.getRequest(db, ws.id, requestId);
  if (!req) return fail(404, 'Request not found.');
  const minutes = Number(input.minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return fail(400, 'Minutes must be a whole number between 1 and 1440.');
  const day = input.logged_on === undefined || input.logged_on === '' ? today() : input.logged_on;
  if (!isDay(day)) return fail(400, 'The date must look like 2026-11-30.');
  if (day > today()) return fail(400, 'Time cannot be logged for a future date.');
  await repo.insertTimeEntry(db, ws.id, requestId, minutes, clampText(input.note, 300), day, actor.userId);
  await repo.logActivity(db, ws.id, 'request', requestId, 'time_logged', actor.userId, actor.via, `${minutes} min`);
  return ok(true);
};

export const removeTime = async (db: DB, ws: Workspace, actor: Actor, requestId: string, entryId: string): Promise<Result<true>> => {
  if (actor.via !== 'hub' || !can(actor, 'request.manage')) return fail(403, 'Only MuzMesh can change logged time.');
  const r = await repo.deleteTimeEntry(db, ws.id, entryId);
  if (!(r.meta.changes ?? 0)) return fail(404, 'Time entry not found.');
  await repo.logActivity(db, ws.id, 'request', requestId, 'time_removed', actor.userId, actor.via);
  return ok(true);
};

export const hoursMeter = async (db: DB, ws: Workspace, month: string) => {
  const used = await repo.minutesInMonth(db, ws.id, month);
  return { month, used, limit: ws.monthly_minutes, remaining: Math.max(0, ws.monthly_minutes - used), over: Math.max(0, used - ws.monthly_minutes) };
};

// ---------- checklist ----------
export const toggleChecklist = async (db: DB, ws: Workspace, actor: Actor, itemId: string, done: boolean): Promise<Result<true>> => {
  if (actor.via !== 'hub' || !can(actor, 'checklist.toggle')) return fail(403, 'Only a workspace owner or MuzMesh can update the checklist.');
  const r = await repo.setChecklistDone(db, ws.id, itemId, done, actor.userId);
  return (r.meta.changes ?? 0) ? ok(true) : fail(404, 'Checklist item not found.');
};

// ---------- context pack ----------
export const saveContext = async (db: DB, ws: Workspace, actor: Actor, input: Record<string, unknown>): Promise<Result<{ version: number; changed: boolean }>> => {
  if (actor.via !== 'hub' || !can(actor, 'context.edit')) return fail(403, 'Only a workspace owner or MuzMesh can edit the context pack.');
  const pack = {} as ContextPack;
  for (const f of CONTEXT_FIELDS) {
    const v = clampText(input[f.key], CONTEXT_FIELD_MAX + 1);
    if (v.length > CONTEXT_FIELD_MAX) return fail(400, `"${f.label}" is too long (over ${CONTEXT_FIELD_MAX} characters).`);
    pack[f.key] = v;
  }
  const body = JSON.stringify(pack);
  const current = await repo.latestContext(db, ws.id);
  if (current && current.body === body) return ok({ version: current.version, changed: false });
  const version = await repo.insertContextVersion(db, ws.id, body, actor.userId);
  await repo.logActivity(db, ws.id, 'context', ws.id, 'saved', actor.userId, actor.via, `v${version}`);
  return ok({ version, changed: true });
};
