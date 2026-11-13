import type { APIRoute } from 'astro';
import { addAsset } from '../../../../lib/assets';
import { appEnv, db, loadWorkspace } from '../../../../lib/web';

// "Save to library" from the image maker.
export const POST: APIRoute = async (ctx) => {
  const access = await loadWorkspace(ctx);
  if (access instanceof Response) return access;
  let fd: FormData;
  try { fd = await ctx.request.formData(); } catch { fd = new FormData(); }
  const png = fd.get('png');
  const r = await addAsset(db(), appEnv().FILES, access.ws, access.actor, png && typeof png !== 'string' ? png : null, { alt: fd.get('alt'), tags: fd.get('tags'), kind: 'made' });
  return new Response(JSON.stringify(r.ok ? { id: r.value.id, url: `${access.base}/assets#a-${r.value.id}` } : { error: r.error }), { status: r.ok ? 200 : r.status, headers: { 'content-type': 'application/json' } });
};
