// Staff-only changes: workspaces, brand kits, members, the MuzMesh team. Callers check for staff first;
// these functions check again so a missed check in a page cannot widen access.
import { isEmail } from './auth';
import { parseBrandConfig } from './brand';
import * as repo from './repo';
import { fail, ok, type Cms, type MemberRole, type Result, type User, type Workspace } from './types';
import { isGa4Property, isSearchConsoleSite } from './stats';
import { isTimeZone, zonedToUtc } from './time';
import { clampText, safeUrl, slugify } from './util';

type DB = D1Database;
const RESERVED = new Set(['new', 'admin', 'api', 'login', 'logout', 'oauth', 'mcp', 'w']);
const notStaff = fail(403, 'Only MuzMesh can do this.');

const parseWorkspace = (f: Record<string, string | undefined>): Result<Omit<repo.WorkspaceInput, 'slug'>> => {
  const name = clampText(f.name, 80);
  if (name.length < 2) return fail(400, 'Give the workspace a name.');
  const site = clampText(f.site_url, 2000), edit = clampText(f.cms_edit_url, 2000);
  const site_url = safeUrl(site), cms_edit_url = safeUrl(edit);
  if ((site && !site_url) || (edit && !cms_edit_url)) return fail(400, 'Links must start with http:// or https://.');
  const cms: Cms = f.cms === 'webflow' ? 'webflow' : f.cms === 'other' ? 'other' : 'sanity';
  const hours = Number(f.monthly_hours ?? '2'), posts = Number(f.monthly_posts ?? '8');
  if (!Number.isFinite(hours) || hours < 0 || hours > 200) return fail(400, 'Monthly hours must be between 0 and 200.');
  if (!Number.isInteger(posts) || posts < 0 || posts > 200) return fail(400, 'Posts per month must be a whole number between 0 and 200.');
  return ok({ name, site_url, cms, cms_edit_url, monthly_minutes: Math.round(hours * 60), monthly_posts: posts });
};

export const createWorkspace = async (db: DB, user: User, f: Record<string, string | undefined>): Promise<Result<Workspace>> => {
  if (!user.is_staff) return notStaff;
  const fields = parseWorkspace(f);
  if (!fields.ok) return fields;
  const slug = slugify(clampText(f.slug, 60) || fields.value.name);
  if (slug.length < 2 || RESERVED.has(slug)) return fail(400, 'Choose a different short name for the address.');
  if (await repo.getWorkspaceBySlug(db, slug)) return fail(409, `The address "${slug}" is already taken.`);
  return ok(await repo.createWorkspace(db, { ...fields.value, slug }));
};

const HOST_RE = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** The settings added for publishing and stats. Empty strings switch a feature off. */
export const parseExtras = (f: Record<string, string | undefined>, ws: Workspace): Result<repo.WorkspaceExtras> => {
  const timezone = clampText(f.timezone ?? ws.timezone, 64) || 'UTC';
  if (!isTimeZone(timezone)) return fail(400, 'Choose a time zone from the list.');
  const ga4 = clampText(f.ga4_property_id ?? ws.ga4_property_id, 20).replace(/^properties\//, '');
  if (ga4 && !isGa4Property(ga4)) return fail(400, 'The Google Analytics property ID is a number, like 412345678.');
  const gsc = clampText(f.search_console_site ?? ws.search_console_site, 300);
  if (gsc && !isSearchConsoleSite(gsc)) return fail(400, 'The Search Console property looks like sc-domain:bookly.com or https://bookly.com/.');
  const clarityRaw = clampText(f.clarity_url ?? ws.clarity_url, 2000);
  const clarity = safeUrl(clarityRaw, { httpsOnly: true });
  if (clarityRaw && !clarity) return fail(400, 'The Clarity link must start with https://.');
  const host = clampText(f.admin_host ?? ws.admin_host, 253).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (host && !HOST_RE.test(host)) return fail(400, 'The client address should look like bookly.com.');
  return ok({ timezone, ga4_property_id: ga4, search_console_site: gsc, clarity_url: clarity, admin_host: host });
};

export const updateWorkspace = async (db: DB, user: User, ws: Workspace, f: Record<string, string | undefined>): Promise<Result<true>> => {
  if (!user.is_staff) return notStaff;
  const fields = parseWorkspace(f);
  if (!fields.ok) return fields;
  const extras = parseExtras(f, ws);
  if (!extras.ok) return extras;
  await repo.updateWorkspace(db, ws.id, { ...fields.value, ...extras.value });
  if (extras.value.timezone !== ws.timezone) {
    // Planned times stay the same on the clock, in the new zone.
    const rows = (await db.prepare("SELECT id, scheduled_for, scheduled_time FROM posts WHERE workspace_id = ? AND status != 'published' AND scheduled_for IS NOT NULL AND scheduled_time IS NOT NULL")
      .bind(ws.id).all<{ id: string; scheduled_for: string; scheduled_time: string }>()).results;
    if (rows.length) await db.batch(rows.map((r) => db.prepare('UPDATE posts SET publish_at = ? WHERE workspace_id = ? AND id = ?').bind(zonedToUtc(r.scheduled_for, r.scheduled_time, extras.value.timezone), ws.id, r.id)));
  }
  await repo.logActivity(db, ws.id, 'workspace', ws.id, 'settings_saved', user.id, 'hub');
  return ok(true);
};

export const BRAND_CONFIG_MAX = 60_000;
export const saveBrand = async (db: DB, user: User, ws: Workspace, raw: string | undefined): Promise<Result<true>> => {
  if (!user.is_staff) return notStaff;
  const text = (raw ?? '').trim();
  if (!text) { await repo.setBrandConfig(db, ws.id, '{}'); return ok(true); }
  if (text.length > BRAND_CONFIG_MAX) return fail(400, 'That file is too large for a brand config.');
  const parsed = parseBrandConfig(text);
  if (!parsed.ok) return fail(400, parsed.error);
  await repo.setBrandConfig(db, ws.id, text);
  await repo.logActivity(db, ws.id, 'workspace', ws.id, 'brand_saved', user.id, 'hub');
  return ok(true);
};

const MEMBER_ROLES: MemberRole[] = ['owner', 'editor', 'viewer'];
export const addMember = async (db: DB, user: User, ws: Workspace, f: Record<string, string | undefined>): Promise<Result<true>> => {
  if (!user.is_staff) return notStaff;
  const email = clampText(f.email, 200).toLowerCase();
  if (!isEmail(email)) return fail(400, 'Enter a valid email address.');
  const role = MEMBER_ROLES.find((r) => r === f.role);
  if (!role) return fail(400, 'Choose a role.');
  await repo.upsertMember(db, ws.id, email, clampText(f.name, 80), role);
  await repo.logActivity(db, ws.id, 'workspace', ws.id, 'member_added', user.id, 'hub', `${email} as ${role}`);
  return ok(true);
};

export const removeMember = async (db: DB, user: User, ws: Workspace, userId: string | undefined): Promise<Result<true>> => {
  if (!user.is_staff) return notStaff;
  await repo.removeMember(db, ws.id, userId ?? '');
  await repo.logActivity(db, ws.id, 'workspace', ws.id, 'member_removed', user.id, 'hub');
  return ok(true);
};

export const addStaff = async (db: DB, user: User, f: Record<string, string | undefined>): Promise<Result<true>> => {
  if (!user.is_staff) return notStaff;
  const email = clampText(f.email, 200).toLowerCase();
  if (!isEmail(email)) return fail(400, 'Enter a valid email address.');
  const existing = await repo.getUserByEmail(db, email);
  if (existing) await repo.setStaff(db, existing.id, true);
  else await repo.createUser(db, email, clampText(f.name, 80), true);
  return ok(true);
};

export const removeStaff = async (db: DB, user: User, userId: string | undefined): Promise<Result<true>> => {
  if (!user.is_staff) return notStaff;
  if (userId === user.id) return fail(400, 'You cannot remove yourself. Ask another MuzMesh teammate.');
  const target = userId ? await repo.getUserById(db, userId) : null;
  if (!target?.is_staff) return fail(404, 'Teammate not found.');
  await repo.setStaff(db, target.id, false);
  return ok(true);
};
