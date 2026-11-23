import type { APIRoute } from 'astro';
import { endSession } from '../lib/auth';
import { db, SESSION_COOKIE } from '../lib/web';

export const POST: APIRoute = async (ctx) => {
  const name = SESSION_COOKIE(ctx.url);
  await endSession(db(), ctx.cookies.get(name)?.value);
  ctx.cookies.delete(name, { path: '/' });
  return ctx.redirect('/login', 303);
};
