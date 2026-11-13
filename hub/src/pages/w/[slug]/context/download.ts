import type { APIRoute } from 'astro';
import { readBrand } from '../../../../lib/brand';
import { compileContext, isExportTarget, knowledgeFileName, readContext } from '../../../../lib/context';
import * as repo from '../../../../lib/repo';
import { db, loadWorkspace, notFound } from '../../../../lib/web';

// Downloads the compiled pack and remembers which version this person took for which AI app,
// so the context page can say "your copy is out of date" after the next edit.
export const GET: APIRoute = async (ctx) => {
  const access = await loadWorkspace(ctx);
  if (access instanceof Response) return access;
  const { ws, user } = access;
  const row = await repo.latestContext(db(), ws.id);
  if (!row) return notFound();
  const target = ctx.url.searchParams.get('target');
  if (isExportTarget(target)) await repo.recordExport(db(), ws.id, user.id, target, row.version);
  const body = compileContext({ workspaceName: ws.name, siteUrl: ws.site_url, brand: readBrand(ws.brand_config), pack: readContext(row.body), version: row.version, updatedAt: row.created_at });
  return new Response(body, {
    headers: { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename="${knowledgeFileName(ws.slug, row.version)}"`, 'cache-control': 'no-store' },
  });
};
