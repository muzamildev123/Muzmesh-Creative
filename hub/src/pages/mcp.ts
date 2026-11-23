import type { APIRoute } from 'astro';
import { preflight, publicEmpty, publicJson } from '../lib/http';
import { handleRpc } from '../lib/mcp';
import { identityForToken, touchGrant } from '../lib/oauth';
import { allow } from '../lib/ratelimit';
import { clientIp, db } from '../lib/web';

// The connector endpoint (MCP over Streamable HTTP, stateless: every request stands alone).
const MAX_BODY = 200_000;

const unauthorized = (origin: string, error?: string): Response =>
  publicJson({ error: error ?? 'unauthorized', error_description: 'Connect Launch Room in your AI app to continue.' }, 401, {
    'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"${error ? `, error="${error}"` : ''}`,
  });

export const POST: APIRoute = async (ctx) => {
  const origin = ctx.url.origin;
  const auth = ctx.request.headers.get('authorization') ?? '';
  const bearer = /^Bearer\s+(\S+)$/i.exec(auth)?.[1] ?? '';
  if (!bearer) {
    if (!(await allow(db(), `mcp-anon:${clientIp(ctx)}`, 120, 600))) return publicJson({ error: 'too_many_requests' }, 429, { 'retry-after': '600' });
    return unauthorized(origin);
  }
  const who = await identityForToken(db(), bearer);
  if (!who) {
    if (!(await allow(db(), `mcp-anon:${clientIp(ctx)}`, 120, 600))) return publicJson({ error: 'too_many_requests' }, 429, { 'retry-after': '600' });
    return unauthorized(origin, 'invalid_token');
  }
  if (!(await allow(db(), `mcp:${who.grantId}`, 300, 300))) return publicJson({ error: 'too_many_requests' }, 429, { 'retry-after': '300' });

  const raw = await ctx.request.text().catch(() => '');
  if (raw.length > MAX_BODY) return publicJson({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request too large.' } }, 413);
  let msg: unknown;
  try { msg = JSON.parse(raw); } catch { return publicJson({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } }, 400); }

  const mcp = { db: db(), workspace: who.workspace, actor: { userId: who.user.id, role: who.role, via: 'mcp' as const }, origin };
  ctx.locals.cfContext?.waitUntil(touchGrant(db(), who.grantId).then(() => undefined, () => undefined));

  if (Array.isArray(msg)) {
    if (msg.length === 0 || msg.length > 20) return publicJson({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid batch.' } }, 400);
    const out: object[] = [];
    for (const m of msg) { const r = await handleRpc(mcp, m); if (r) out.push(r); }
    return out.length ? publicJson(out) : publicEmpty(202);
  }
  const reply = await handleRpc(mcp, msg);
  return reply ? publicJson(reply) : publicEmpty(202);
};

// No server-initiated stream and no sessions to end.
export const GET: APIRoute = () => publicEmpty(405, { allow: 'POST, OPTIONS' });
export const DELETE: APIRoute = () => publicEmpty(405, { allow: 'POST, OPTIONS' });
export const OPTIONS: APIRoute = () => preflight('POST, OPTIONS');
