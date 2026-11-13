// All SQL lives here. Every function that touches client data takes a workspaceId and filters on it,
// so a row can never be read or changed through another workspace. test/tenancy.test.ts proves it.
import type { Channel } from './brand-check';
import type {
  ActivityRow, ChecklistItem, Cms, MemberRole, Post, PostStatus, RequestStatus, Role, TimeEntry, User, Via, Workspace, WorkRequest,
} from './types';
import { monthRange, newId, nowIso } from './util';

type DB = D1Database;

// ---------- users ----------
export const getUserByEmail = (db: DB, email: string) =>
  db.prepare('SELECT * FROM users WHERE email = ?').bind(email.trim().toLowerCase()).first<User>();
export const getUserById = (db: DB, id: string) => db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
export const countUsers = async (db: DB) => (await db.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>())?.n ?? 0;

export const createUser = async (db: DB, email: string, name: string, isStaff: boolean): Promise<User> => {
  const user: User = { id: newId(), email: email.trim().toLowerCase(), name: name.trim(), is_staff: isStaff ? 1 : 0, created_at: nowIso() };
  await db.prepare('INSERT INTO users (id, email, name, is_staff, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(user.id, user.email, user.name, user.is_staff, user.created_at).run();
  return user;
};
export const listStaff = async (db: DB) => (await db.prepare('SELECT * FROM users WHERE is_staff = 1 ORDER BY email').all<User>()).results;
export const setStaff = (db: DB, userId: string, isStaff: boolean) =>
  db.prepare('UPDATE users SET is_staff = ? WHERE id = ?').bind(isStaff ? 1 : 0, userId).run();

// ---------- workspaces and access ----------
export const getWorkspaceBySlug = (db: DB, slug: string) => db.prepare('SELECT * FROM workspaces WHERE slug = ?').bind(slug).first<Workspace>();
export const getWorkspaceById = (db: DB, id: string) => db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(id).first<Workspace>();

export const listWorkspacesForUser = async (db: DB, user: User): Promise<(Workspace & { role: Role })[]> => {
  if (user.is_staff) {
    const rows = (await db.prepare('SELECT * FROM workspaces ORDER BY name').all<Workspace>()).results;
    return rows.map((w) => ({ ...w, role: 'staff' as Role }));
  }
  return (await db.prepare(
    'SELECT w.*, m.role AS role FROM workspaces w JOIN memberships m ON m.workspace_id = w.id WHERE m.user_id = ? ORDER BY w.name',
  ).bind(user.id).all<Workspace & { role: Role }>()).results;
};

/** The user's role in a workspace, or null when they have no access. Checked on every request and every MCP call. */
export const roleIn = async (db: DB, user: User, workspaceId: string): Promise<Role | null> => {
  if (user.is_staff) return 'staff';
  const row = await db.prepare('SELECT role FROM memberships WHERE user_id = ? AND workspace_id = ?').bind(user.id, workspaceId).first<{ role: MemberRole }>();
  return row?.role ?? null;
};

export interface WorkspaceInput { name: string; slug: string; site_url: string; cms: Cms; cms_edit_url: string; monthly_minutes: number; monthly_posts: number }

export const DEFAULT_CHECKLIST = [
  'Setup payment received',
  'Logo files received',
  'Copy draft received',
  'Domain and DNS access',
  'Analytics and Search Console access',
  'Social account access (LinkedIn, X)',
  'Kickoff call done',
];

export const createWorkspace = async (db: DB, input: WorkspaceInput): Promise<Workspace> => {
  const ws: Workspace = { id: newId(), brand_config: '{}', created_at: nowIso(), ...input };
  const stmts = [
    db.prepare('INSERT INTO workspaces (id, slug, name, site_url, cms, cms_edit_url, monthly_minutes, monthly_posts, brand_config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(ws.id, ws.slug, ws.name, ws.site_url, ws.cms, ws.cms_edit_url, ws.monthly_minutes, ws.monthly_posts, ws.brand_config, ws.created_at),
    ...DEFAULT_CHECKLIST.map((label, i) =>
      db.prepare('INSERT INTO checklist_items (id, workspace_id, label, position) VALUES (?, ?, ?, ?)').bind(newId(), ws.id, label, i)),
  ];
  await db.batch(stmts);
  return ws;
};

export const updateWorkspace = (db: DB, workspaceId: string, input: Omit<WorkspaceInput, 'slug'>) =>
  db.prepare('UPDATE workspaces SET name = ?, site_url = ?, cms = ?, cms_edit_url = ?, monthly_minutes = ?, monthly_posts = ? WHERE id = ?')
    .bind(input.name, input.site_url, input.cms, input.cms_edit_url, input.monthly_minutes, input.monthly_posts, workspaceId).run();

export const setBrandConfig = (db: DB, workspaceId: string, json: string) =>
  db.prepare('UPDATE workspaces SET brand_config = ? WHERE id = ?').bind(json, workspaceId).run();

// ---------- members ----------
export interface MemberRow { user_id: string; email: string; name: string; role: MemberRole; created_at: string }
export const listMembers = async (db: DB, workspaceId: string) =>
  (await db.prepare('SELECT u.id AS user_id, u.email, u.name, m.role, m.created_at FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? ORDER BY u.email')
    .bind(workspaceId).all<MemberRow>()).results;

export const upsertMember = async (db: DB, workspaceId: string, email: string, name: string, role: MemberRole): Promise<User> => {
  const user = (await getUserByEmail(db, email)) ?? (await createUser(db, email, name, false));
  await db.prepare('INSERT INTO memberships (user_id, workspace_id, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = excluded.role')
    .bind(user.id, workspaceId, role, nowIso()).run();
  return user;
};

/** Removes the membership and everything it unlocked: connector grants for this workspace stop working at once. */
export const removeMember = async (db: DB, workspaceId: string, userId: string) => {
  await db.batch([
    db.prepare('DELETE FROM memberships WHERE workspace_id = ? AND user_id = ?').bind(workspaceId, userId),
    db.prepare('UPDATE oauth_grants SET revoked_at = ? WHERE workspace_id = ? AND user_id = ? AND revoked_at IS NULL').bind(nowIso(), workspaceId, userId),
  ]);
};

// ---------- posts ----------
export interface PostFilter { status?: PostStatus; month?: string }
export const listPosts = async (db: DB, workspaceId: string, filter: PostFilter = {}): Promise<Post[]> => {
  const where = ['workspace_id = ?'];
  const args: unknown[] = [workspaceId];
  if (filter.status) { where.push('status = ?'); args.push(filter.status); }
  if (filter.month) { const { from, to } = monthRange(filter.month); where.push('scheduled_for >= ? AND scheduled_for < ?'); args.push(from, to); }
  return (await db.prepare(`SELECT * FROM posts WHERE ${where.join(' AND ')} ORDER BY COALESCE(scheduled_for, '9999-12-31'), created_at DESC LIMIT 500`)
    .bind(...args).all<Post>()).results;
};

export const getPost = (db: DB, workspaceId: string, id: string) =>
  db.prepare('SELECT * FROM posts WHERE workspace_id = ? AND id = ?').bind(workspaceId, id).first<Post>();

export interface PostFields { channel: Channel; copy: string; image: string; scheduled_for: string | null }
export const insertPost = async (db: DB, workspaceId: string, fields: PostFields, userId: string, source: Via): Promise<Post> => {
  const t = nowIso();
  const post: Post = { id: newId(), workspace_id: workspaceId, status: 'draft', published_url: '', published_at: null, source, created_by: userId, created_at: t, updated_at: t, ...fields };
  await db.prepare('INSERT INTO posts (id, workspace_id, channel, copy, image, status, scheduled_for, source, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(post.id, workspaceId, post.channel, post.copy, post.image, post.status, post.scheduled_for, source, userId, t, t).run();
  return post;
};

export const updatePostFields = (db: DB, workspaceId: string, id: string, fields: PostFields, status: PostStatus) =>
  db.prepare('UPDATE posts SET channel = ?, copy = ?, image = ?, scheduled_for = ?, status = ?, updated_at = ? WHERE workspace_id = ? AND id = ?')
    .bind(fields.channel, fields.copy, fields.image, fields.scheduled_for, status, nowIso(), workspaceId, id).run();

/** Moves a post between statuses only if it is still in the expected one, so two people cannot both act on a stale page. */
export const setPostStatus = async (db: DB, workspaceId: string, id: string, from: PostStatus, to: PostStatus, extra: { published_url?: string } = {}): Promise<boolean> => {
  const t = nowIso();
  const r = to === 'published'
    ? await db.prepare('UPDATE posts SET status = ?, published_url = ?, published_at = ?, updated_at = ? WHERE workspace_id = ? AND id = ? AND status = ?')
        .bind(to, extra.published_url ?? '', t, t, workspaceId, id, from).run()
    : await db.prepare('UPDATE posts SET status = ?, updated_at = ? WHERE workspace_id = ? AND id = ? AND status = ?').bind(to, t, workspaceId, id, from).run();
  return (r.meta.changes ?? 0) > 0;
};

export const setPostDate = (db: DB, workspaceId: string, id: string, day: string | null) =>
  db.prepare("UPDATE posts SET scheduled_for = ?, updated_at = ? WHERE workspace_id = ? AND id = ? AND status != 'published'").bind(day, nowIso(), workspaceId, id).run();

export const deletePost = async (db: DB, workspaceId: string, id: string): Promise<boolean> => {
  const r = await db.batch([
    db.prepare("DELETE FROM activity WHERE workspace_id = ? AND subject_type = 'post' AND subject_id = ? AND EXISTS (SELECT 1 FROM posts WHERE workspace_id = ? AND id = ? AND status = 'draft')").bind(workspaceId, id, workspaceId, id),
    db.prepare("DELETE FROM posts WHERE workspace_id = ? AND id = ? AND status = 'draft'").bind(workspaceId, id),
  ]);
  return (r[1]?.meta.changes ?? 0) > 0;
};

// ---------- requests and time ----------
export const listRequests = async (db: DB, workspaceId: string, status?: RequestStatus) => {
  const sql = `SELECT r.*, COALESCE((SELECT SUM(minutes) FROM time_entries t WHERE t.request_id = r.id AND t.workspace_id = r.workspace_id), 0) AS minutes
    FROM requests r WHERE r.workspace_id = ? ${status ? 'AND r.status = ?' : ''} ORDER BY r.created_at DESC LIMIT 500`;
  const stmt = status ? db.prepare(sql).bind(workspaceId, status) : db.prepare(sql).bind(workspaceId);
  return (await stmt.all<WorkRequest & { minutes: number }>()).results;
};
export const getRequest = (db: DB, workspaceId: string, id: string) =>
  db.prepare('SELECT * FROM requests WHERE workspace_id = ? AND id = ?').bind(workspaceId, id).first<WorkRequest>();

export const insertRequest = async (db: DB, workspaceId: string, f: { title: string; detail: string; page_url: string }, userId: string, source: Via): Promise<WorkRequest> => {
  const t = nowIso();
  const req: WorkRequest = { id: newId(), workspace_id: workspaceId, status: 'open', source, created_by: userId, created_at: t, updated_at: t, done_at: null, ...f };
  await db.prepare('INSERT INTO requests (id, workspace_id, title, detail, page_url, status, source, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(req.id, workspaceId, f.title, f.detail, f.page_url, 'open', source, userId, t, t).run();
  return req;
};

export const setRequestStatus = (db: DB, workspaceId: string, id: string, status: RequestStatus) => {
  const t = nowIso();
  return db.prepare('UPDATE requests SET status = ?, updated_at = ?, done_at = ? WHERE workspace_id = ? AND id = ?')
    .bind(status, t, status === 'done' ? t : null, workspaceId, id).run();
};

export const insertTimeEntry = (db: DB, workspaceId: string, requestId: string, minutes: number, note: string, loggedOn: string, userId: string) =>
  db.prepare('INSERT INTO time_entries (id, workspace_id, request_id, minutes, note, logged_on, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), workspaceId, requestId, minutes, note, loggedOn, userId, nowIso()).run();

export const listTimeEntries = async (db: DB, workspaceId: string, requestId: string) =>
  (await db.prepare('SELECT id, request_id, minutes, note, logged_on, user_id, created_at FROM time_entries WHERE workspace_id = ? AND request_id = ? ORDER BY logged_on DESC, created_at DESC')
    .bind(workspaceId, requestId).all<TimeEntry>()).results;

export const deleteTimeEntry = (db: DB, workspaceId: string, id: string) =>
  db.prepare('DELETE FROM time_entries WHERE workspace_id = ? AND id = ?').bind(workspaceId, id).run();

/** Minutes logged in a calendar month (UTC), for the hours meter. */
export const minutesInMonth = async (db: DB, workspaceId: string, month: string): Promise<number> => {
  const { from, to } = monthRange(month);
  const row = await db.prepare('SELECT COALESCE(SUM(minutes), 0) AS n FROM time_entries WHERE workspace_id = ? AND logged_on >= ? AND logged_on < ?')
    .bind(workspaceId, from, to).first<{ n: number }>();
  return row?.n ?? 0;
};

// ---------- checklist ----------
export const listChecklist = async (db: DB, workspaceId: string) =>
  (await db.prepare('SELECT id, label, position, done_at FROM checklist_items WHERE workspace_id = ? ORDER BY position, label').bind(workspaceId).all<ChecklistItem>()).results;
export const setChecklistDone = (db: DB, workspaceId: string, id: string, done: boolean, userId: string) =>
  db.prepare('UPDATE checklist_items SET done_at = ?, done_by = ? WHERE workspace_id = ? AND id = ?').bind(done ? nowIso() : null, done ? userId : null, workspaceId, id).run();

// ---------- activity ----------
export const logActivity = (db: DB, workspaceId: string, subjectType: 'post' | 'request' | 'context' | 'workspace', subjectId: string, action: string, userId: string, via: Via, note = '') =>
  db.prepare('INSERT INTO activity (id, workspace_id, subject_type, subject_id, action, note, user_id, via, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), workspaceId, subjectType, subjectId, action, note.slice(0, 1000), userId, via, nowIso()).run();

export const listActivity = async (db: DB, workspaceId: string, subjectType: string, subjectId: string) =>
  (await db.prepare(`SELECT a.id, a.action, a.note, a.via, a.created_at, u.name AS user_name, u.email AS user_email
    FROM activity a LEFT JOIN users u ON u.id = a.user_id
    WHERE a.workspace_id = ? AND a.subject_type = ? AND a.subject_id = ? ORDER BY a.created_at DESC LIMIT 100`)
    .bind(workspaceId, subjectType, subjectId).all<ActivityRow>()).results;

// ---------- context pack ----------
export interface ContextVersionRow { version: number; body: string; created_at: string; created_by: string | null }
export const latestContext = (db: DB, workspaceId: string) =>
  db.prepare('SELECT version, body, created_at, created_by FROM context_versions WHERE workspace_id = ? ORDER BY version DESC LIMIT 1').bind(workspaceId).first<ContextVersionRow>();

export const insertContextVersion = async (db: DB, workspaceId: string, body: string, userId: string): Promise<number> => {
  // The version number is computed inside the INSERT, so two saves at once cannot share one.
  const row = await db.prepare(`INSERT INTO context_versions (workspace_id, version, body, created_by, created_at)
    VALUES (?, COALESCE((SELECT MAX(version) FROM context_versions WHERE workspace_id = ?), 0) + 1, ?, ?, ?) RETURNING version`)
    .bind(workspaceId, workspaceId, body, userId, nowIso()).first<{ version: number }>();
  return row?.version ?? 1;
};

export const recordExport = (db: DB, workspaceId: string, userId: string, target: string, version: number) =>
  db.prepare(`INSERT INTO context_exports (workspace_id, user_id, target, version, exported_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (workspace_id, user_id, target) DO UPDATE SET version = excluded.version, exported_at = excluded.exported_at`)
    .bind(workspaceId, userId, target, version, nowIso()).run();

export const listExports = async (db: DB, workspaceId: string, userId: string) =>
  (await db.prepare('SELECT target, version, exported_at FROM context_exports WHERE workspace_id = ? AND user_id = ?').bind(workspaceId, userId).all<{ target: string; version: number; exported_at: string }>()).results;

// ---------- overview numbers ----------
export interface WorkspaceStats { posts_planned: number; posts_in_review: number; posts_published: number; requests_open: number; minutes: number }
export const workspaceStats = async (db: DB, workspaceId: string, month: string): Promise<WorkspaceStats> => {
  const { from, to } = monthRange(month);
  const w = workspaceId;
  const row = await db.prepare(`SELECT
    (SELECT COUNT(*) FROM posts WHERE workspace_id = ? AND scheduled_for >= ? AND scheduled_for < ?) AS posts_planned,
    (SELECT COUNT(*) FROM posts WHERE workspace_id = ? AND status = 'in_review') AS posts_in_review,
    (SELECT COUNT(*) FROM posts WHERE workspace_id = ? AND status = 'published' AND scheduled_for >= ? AND scheduled_for < ?) AS posts_published,
    (SELECT COUNT(*) FROM requests WHERE workspace_id = ? AND status IN ('open', 'in_progress')) AS requests_open,
    (SELECT COALESCE(SUM(minutes), 0) FROM time_entries WHERE workspace_id = ? AND logged_on >= ? AND logged_on < ?) AS minutes`)
    .bind(w, from, to, w, w, from, to, w, w, from, to).first<WorkspaceStats>();
  return row ?? { posts_planned: 0, posts_in_review: 0, posts_published: 0, requests_open: 0, minutes: 0 };
};

/** Every workspace's posts for a month, for the MuzMesh all-clients calendar. Staff only: the caller checks. */
export const listAllPostsInMonth = async (db: DB, month: string) => {
  const { from, to } = monthRange(month);
  return (await db.prepare(`SELECT p.*, w.slug AS workspace_slug, w.name AS workspace_name FROM posts p JOIN workspaces w ON w.id = p.workspace_id
    WHERE p.scheduled_for >= ? AND p.scheduled_for < ? ORDER BY p.scheduled_for, w.name LIMIT 2000`).bind(from, to).all<Post & { workspace_slug: string; workspace_name: string }>()).results;
};
