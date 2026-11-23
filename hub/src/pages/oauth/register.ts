import type { APIRoute } from 'astro';
import { preflight, publicJson } from '../../lib/http';
import { registerClient } from '../../lib/oauth';
import { allow } from '../../lib/ratelimit';
import { clientIp, db } from '../../lib/web';

// Dynamic client registration: how Claude, ChatGPT and other apps introduce themselves before sign-in.
export const POST: APIRoute = async (ctx) => {
  if (!(await allow(db(), `oauth-register:${clientIp(ctx)}`, 20, 3600))) return publicJson({ error: 'too_many_requests' }, 429, { 'retry-after': '3600' });
  const raw = await ctx.request.text().catch(() => '');
  if (raw.length > 10_000) return publicJson({ error: 'invalid_client_metadata', error_description: 'Request too large.' }, 400);
  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { /* handled below */ }
  const r = await registerClient(db(), body);
  if (!r.ok) return publicJson({ error: r.error, error_description: r.description }, 400);
  const c = r.client;
  return publicJson({
    client_id: c.client_id, client_name: c.client_name, redirect_uris: c.redirect_uris,
    grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none',
    client_id_issued_at: Math.floor(Date.parse(c.created_at) / 1000),
  }, 201);
};
export const OPTIONS: APIRoute = () => preflight('POST, OPTIONS');
