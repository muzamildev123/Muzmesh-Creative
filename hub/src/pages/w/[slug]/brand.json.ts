import type { APIRoute } from 'astro';
import { readBrand } from '../../../lib/brand';
import { loadWorkspace, notFound } from '../../../lib/web';

export const GET: APIRoute = async (ctx) => {
  const access = await loadWorkspace(ctx);
  if (access instanceof Response) return access;
  if (!readBrand(access.ws.brand_config)) return notFound();
  return new Response(access.ws.brand_config, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${access.ws.slug}.brand.config.json"`, 'cache-control': 'no-store' },
  });
};
