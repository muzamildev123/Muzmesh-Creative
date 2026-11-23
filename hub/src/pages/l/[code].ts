import type { APIRoute } from 'astro';
import { countClick, isBot, isCode, linkTarget } from '../../lib/links';
import { db, notFound } from '../../lib/web';

// Short links in published posts. Counts a click (not link previews or crawlers), then sends the person on.
export const GET: APIRoute = async (ctx) => {
  const code = ctx.params.code;
  if (!isCode(code)) return notFound(ctx);
  const link = await linkTarget(db(), code);
  if (!link || !/^https?:\/\//.test(link.target_url)) return notFound(ctx);
  if (!isBot(ctx.request.headers.get('user-agent'))) {
    try { await countClick(db(), link); } catch { /* a lost count never blocks the visit */ }
  }
  return new Response(null, { status: 302, headers: { location: link.target_url, 'cache-control': 'no-store', 'referrer-policy': 'unsafe-url' } });
};
