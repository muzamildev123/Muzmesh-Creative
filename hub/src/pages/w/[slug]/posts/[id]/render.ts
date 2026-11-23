import type { APIRoute } from 'astro';
import { can } from '../../../../../lib/authz';
import { addAsset, imageSize } from '../../../../../lib/assets';
import * as repo from '../../../../../lib/repo';
import { readImage } from '../../../../../lib/service';
import { appEnv, db, loadWorkspace } from '../../../../../lib/web';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Stores the PNG the browser drew from a post's template image, so the scheduler can attach it.
export const POST: APIRoute = async (ctx) => {
  const access = await loadWorkspace(ctx);
  if (access instanceof Response) return access;
  const { ws, actor } = access;
  if (!can(actor, 'post.write')) return json(403, { error: 'Your role cannot change posts.' });
  const post = await repo.getPost(db(), ws.id, ctx.params.id ?? '');
  if (!post || post.status === 'published') return json(404, { error: 'Post not found.' });
  let fd: FormData;
  try { fd = await ctx.request.formData(); } catch { return json(400, { error: 'Send a PNG.' }); }
  const png = fd.get('png');
  const image = fd.get('image');
  if (typeof image !== 'string' || image !== post.image) return json(409, { error: 'The post image changed. Reload the page.' });
  if (post.image_rendered === post.image && post.render_asset_id) return json(200, { id: post.render_asset_id, already: true });
  if (!png || typeof png === 'string' || png.type !== 'image/png') return json(400, { error: 'Send a PNG.' });
  const size = imageSize(new Uint8Array(await png.slice(0, 32).arrayBuffer()), 'image/png');
  if (!size || size.w !== 1080 || size.h !== 1080) return json(400, { error: 'The image must be 1080 by 1080.' });
  const r = await addAsset(db(), appEnv().FILES, ws, actor, png, { kind: 'made', tags: 'post image', alt: [readImage(image)?.kicker, readImage(image)?.headline, readImage(image)?.sub].filter(Boolean).join('. ') });
  if (!r.ok) return json(r.status, { error: r.error });
  await repo.setRender(db(), ws.id, post.id, r.value.id, image);
  return json(200, { id: r.value.id });
};
