import { defineMiddleware } from 'astro:middleware';
import { userForSession } from './lib/auth';
import { db, SESSION_COOKIE } from './lib/web';

// Called cross-origin by AI apps with bearer tokens or no credentials at all. Cookies are never read there.
const TOKEN_ROUTES = ['/mcp', '/oauth/token', '/oauth/register'];
const isTokenRoute = (path: string) => TOKEN_ROUTES.includes(path) || path.startsWith('/.well-known/');

const CSP = (path: string) => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  // The consent page must be able to send the browser back to the AI app after its form post.
  ...(path === '/oauth/authorize' ? [] : ["form-action 'self'"]),
].join('; ');

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { request, url } = ctx;
  const path = url.pathname;
  ctx.locals.user = null;

  if (!isTokenRoute(path)) {
    // CSRF: a state-changing request must come from our own pages.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.get('origin');
      const site = request.headers.get('sec-fetch-site');
      const sameOrigin = origin ? origin === url.origin : site === 'same-origin';
      if (!sameOrigin) return new Response('Cross-site request blocked.', { status: 403 });
    }
    ctx.locals.user = await userForSession(db(), ctx.cookies.get(SESSION_COOKIE(url))?.value);
  }

  const res = await next();
  const type = res.headers.get('content-type') ?? '';
  res.headers.set('x-content-type-options', 'nosniff');
  res.headers.set('referrer-policy', 'same-origin');
  if (url.protocol === 'https:') res.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  if (type.includes('text/html')) {
    res.headers.set('x-frame-options', 'DENY');
    res.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    res.headers.set('cache-control', 'no-store');
    // Astro's dev server injects inline scripts for hot reload, so the policy is enforced in builds only.
    if (import.meta.env.PROD) res.headers.set('content-security-policy', CSP(path));
  }
  return res;
});
