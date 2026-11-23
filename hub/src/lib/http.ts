// Responses for the endpoints AI apps call directly (OAuth and MCP). These never use cookies,
// so any origin may call them: access is decided by the bearer token alone.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'access-control-expose-headers': 'www-authenticate, mcp-session-id',
  'access-control-max-age': '86400',
};

export const publicJson = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS, ...headers } });

export const preflight = (methods: string): Response =>
  new Response(null, { status: 204, headers: { ...CORS, 'access-control-allow-methods': methods } });

export const publicEmpty = (status: number, headers: Record<string, string> = {}): Response =>
  new Response(null, { status, headers: { ...CORS, ...headers } });
