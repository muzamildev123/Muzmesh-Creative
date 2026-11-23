import type { APIRoute } from 'astro';
import { getAsset } from '../../../../../lib/assets';
import { appEnv, db, loadWorkspace, notFound } from '../../../../../lib/web';

// Serves a library file to signed-in members of its workspace only.
export const GET: APIRoute = async (ctx) => {
  const access = await loadWorkspace(ctx);
  if (access instanceof Response) return access;
  const a = await getAsset(db(), access.ws.id, ctx.params.id ?? '');
  const obj = a ? await appEnv().FILES?.get(a.r2_key) : null;
  if (!a || !obj) return notFound(ctx);
  const download = ctx.url.searchParams.has('download') || !a.content_type.startsWith('image/');
  return new Response(obj.body, {
    headers: {
      'content-type': a.content_type,
      'content-length': String(obj.size),
      'cache-control': 'private, max-age=3600',
      // An SVG or PDF opened directly cannot run scripts against the app.
      'content-security-policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${a.filename.replace(/[^\w.-]/g, '_')}"`,
    },
  });
};
