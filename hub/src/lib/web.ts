// Glue between Astro pages and the library code. Worker-only (imports the Cloudflare env).
import type { AstroGlobal, APIContext } from 'astro';
import { env } from 'cloudflare:workers';
import * as repo from './repo';
import type { Actor, Result, Role, User, Workspace } from './types';

type Ctx = AstroGlobal | APIContext;

export const db = (): D1Database => env.DB;
export const appEnv = () => env;

export const SESSION_COOKIE = (url: URL) => (url.protocol === 'https:' ? '__Host-lr_session' : 'lr_session');
const FLASH_COOKIE = 'lr_flash';

export const isLocalhost = (url: URL) => url.hostname === 'localhost' || url.hostname === '127.0.0.1';

export const clientIp = (ctx: Ctx): string => ctx.request.headers.get('cf-connecting-ip') ?? 'local';

/** A one-time message shown on the next page, carried in a short-lived cookie rather than the URL. */
export const flash = (ctx: Ctx, kind: 'ok' | 'err', text: string) => {
  ctx.cookies.set(FLASH_COOKIE, JSON.stringify({ kind, text: text.slice(0, 400) }), { path: '/', httpOnly: true, sameSite: 'lax', secure: ctx.url.protocol === 'https:', maxAge: 60 });
};
export const takeFlash = (ctx: Ctx): { kind: 'ok' | 'err'; text: string } | null => {
  const raw = ctx.cookies.get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  ctx.cookies.delete(FLASH_COOKIE, { path: '/' });
  try {
    const f = JSON.parse(raw) as { kind?: unknown; text?: unknown };
    if ((f.kind === 'ok' || f.kind === 'err') && typeof f.text === 'string') return { kind: f.kind, text: f.text };
  } catch { /* ignore a broken cookie */ }
  return null;
};

/** Redirect back after a form post, with the result as a flash message. */
export const done = <T>(ctx: Ctx, to: string, result: Result<T>, okText: string): Response => {
  flash(ctx, result.ok ? 'ok' : 'err', result.ok ? okText : result.error);
  return ctx.redirect(to, 303);
};

export const loginRedirect = (ctx: Ctx): Response =>
  ctx.redirect(`/login?next=${encodeURIComponent(ctx.url.pathname + ctx.url.search)}`, 303);

/** The same "not found" page for a missing thing and for a thing you may not see, so neither can be told apart. */
export const notFound = (ctx: Ctx): Promise<Response> => ctx.rewrite('/404');

export interface WorkspaceAccess { user: User; ws: Workspace; role: Role; actor: Actor; base: string }

/**
 * Loads the workspace in the URL and the signed-in user's role in it.
 * No access and no such workspace both answer 404, so slugs cannot be probed.
 */
export const loadWorkspace = async (ctx: Ctx): Promise<WorkspaceAccess | Response> => {
  const user = ctx.locals.user;
  if (!user) return loginRedirect(ctx);
  const slug = ctx.params.slug ?? '';
  const ws = /^[a-z0-9-]{1,40}$/.test(slug) ? await repo.getWorkspaceBySlug(db(), slug) : null;
  if (!ws) return notFound(ctx);
  const role = await repo.roleIn(db(), user, ws.id);
  if (!role) return notFound(ctx);
  return { user, ws, role, actor: { userId: user.id, role, via: 'hub' }, base: `/w/${ws.slug}` };
};

export const requireStaff = async (ctx: Ctx): Promise<User | Response> => {
  const user = ctx.locals.user;
  if (!user) return loginRedirect(ctx);
  return user.is_staff ? user : notFound(ctx);
};

export const formOf = async (ctx: Ctx): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  try {
    const fd = await ctx.request.formData();
    for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
  } catch { /* empty or malformed body */ }
  return out;
};

/** JSON for a <script type="application/json"> block. Escapes "<" so the data cannot close the tag. */
export const jsonForScript = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c');
