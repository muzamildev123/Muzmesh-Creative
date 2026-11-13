import type { APIRoute } from 'astro';
import { preflight, publicJson } from '../../lib/http';
import { exchangeToken } from '../../lib/oauth';
import { allow } from '../../lib/ratelimit';
import { clientIp, db } from '../../lib/web';

export const POST: APIRoute = async (ctx) => {
  if (!(await allow(db(), `oauth-token:${clientIp(ctx)}`, 120, 600))) return publicJson({ error: 'too_many_requests' }, 429, { 'retry-after': '600' });
  const raw = await ctx.request.text().catch(() => '');
  if (raw.length > 10_000) return publicJson({ error: 'invalid_request', error_description: 'Request too large.' }, 400);
  const r = await exchangeToken(db(), new URLSearchParams(raw));
  if (!r.ok) return publicJson({ error: r.error, error_description: r.description }, 400, { pragma: 'no-cache' });
  return publicJson(r.body, 200, { pragma: 'no-cache' });
};
export const OPTIONS: APIRoute = () => preflight('POST, OPTIONS');
