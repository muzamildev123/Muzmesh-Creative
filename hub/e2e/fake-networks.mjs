// A stand-in for LinkedIn, X and Google, for the end-to-end run. Never used in production.
//   node e2e/fake-networks.mjs            (listens on FAKE_PORT, default 4390)
// Point the app at it with these in .dev.vars:
//   LINKEDIN_AUTH_BASE / LINKEDIN_API_BASE / X_AUTH_BASE / X_API_BASE = http://localhost:4390
//   GOOGLE_TOKEN_URL = http://localhost:4390/google/token, GA4_API_BASE = GSC_API_BASE = http://localhost:4390
// The authorize pages skip the consent screen and send the browser straight back with a code.
// GET /_calls lists every call the app made, so the test can check what would have been posted.
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_PORT ?? 4390);
const calls = [];
let failTweets = 0;

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(body === null ? '' : JSON.stringify(body));
};
const read = (req) => new Promise((resolve) => { const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); });
const dayStr = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10).replace(/-/g, '');

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const raw = await read(req);
  const type = req.headers['content-type'] ?? '';
  let body = null;
  if (type.includes('json')) body = JSON.parse(raw.toString() || 'null');
  else if (type.includes('urlencoded')) body = Object.fromEntries(new URLSearchParams(raw.toString()));
  else if (raw.length) body = `<${raw.length} bytes ${type.split(';')[0]}>`;
  if (!url.pathname.startsWith('/_')) calls.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), headers: { 'linkedin-version': req.headers['linkedin-version'], authorization: req.headers.authorization ? 'present' : '' }, body });
  const p = url.pathname;

  if (p === '/_calls') return send(res, 200, calls);
  if (p === '/_reset') { calls.length = 0; failTweets = 0; return send(res, 200, { ok: true }); }
  if (p === '/_fail-tweets') { failTweets = Number(url.searchParams.get('n') ?? 1); return send(res, 200, { failTweets }); }

  // Consent screens: go straight back with a code.
  if (p === '/i/oauth2/authorize' || p === '/oauth/v2/authorization') {
    const back = new URL(url.searchParams.get('redirect_uri'));
    back.searchParams.set('code', 'fake-code');
    back.searchParams.set('state', url.searchParams.get('state'));
    res.writeHead(302, { location: back.toString() });
    return res.end();
  }

  // X
  if (p === '/2/oauth2/token') return send(res, 200, { access_token: `x-at-${calls.length}`, refresh_token: `x-rt-${calls.length}`, expires_in: 7200, token_type: 'bearer' });
  if (p === '/2/users/me') return send(res, 200, { data: { id: '1234', name: 'Bookly', username: 'booklyapp' } });
  if (p === '/2/media/upload') return send(res, 200, { data: { id: 'media-1' } });
  if (p === '/2/tweets') {
    if (failTweets > 0) { failTweets--; return send(res, 503, { title: 'Service Unavailable' }); }
    return send(res, 201, { data: { id: `19${calls.length}`, text: body?.text } });
  }

  // LinkedIn
  if (p === '/oauth/v2/accessToken') return send(res, 200, { access_token: 'li-at', expires_in: 5184000 });
  if (p === '/v2/userinfo') return send(res, 200, { sub: 'demo123', name: 'Demo Owner' });
  if (p === '/rest/images' && url.searchParams.get('action') === 'initializeUpload') return send(res, 200, { value: { uploadUrl: `http://localhost:${PORT}/li-upload`, image: 'urn:li:image:1' } });
  if (p === '/li-upload') return send(res, 201, null);
  if (p.startsWith('/rest/images/')) return send(res, 200, { status: 'AVAILABLE' });
  if (p === '/rest/posts') return send(res, 201, null, { 'x-restli-id': `urn:li:share:${calls.length}` });

  // Google
  if (p === '/google/token') return send(res, 200, { access_token: 'g-at', expires_in: 3600 });
  if (/^\/v1beta\/properties\/\d+:runReport$/.test(p)) {
    const dim = body?.dimensions?.[0]?.name;
    if (dim === 'date') return send(res, 200, { rows: Array.from({ length: 28 }, (_, i) => ({ dimensionValues: [{ value: dayStr(28 - i) }], metricValues: [{ value: String(40 + ((i * 37) % 60)) }, { value: String(50 + i) }, { value: String(120 + i * 3) }] })) });
    if (dim === 'pagePath') return send(res, 200, { rows: [['/', 2210], ['/pricing', 940], ['/blog/remember-what-you-read', 610], ['/signup', 380]].map(([v, n]) => ({ dimensionValues: [{ value: v }], metricValues: [{ value: String(n) }] })) });
    if (dim === 'sessionDefaultChannelGroup') return send(res, 200, { rows: [['Organic Search', 820], ['Direct', 610], ['Organic Social', 290], ['Referral', 95]].map(([v, n]) => ({ dimensionValues: [{ value: v }], metricValues: [{ value: String(n) }] })) });
    return send(res, 200, { rows: [{ metricValues: [{ value: '1830' }, { value: '2390' }, { value: '5120' }, { value: '74' }] }] });
  }
  if (p.startsWith('/webmasters/v3/sites/')) {
    if (body?.dimensions?.[0] === 'query') return send(res, 200, { rows: [['ai reading app', 61, 900, 4.2], ['book summaries app', 44, 1300, 7.9], ['bookly', 38, 120, 1.1]].map(([k, c, i, pos]) => ({ keys: [k], clicks: c, impressions: i, ctr: c / i, position: pos })) });
    return send(res, 200, { rows: [{ clicks: 212, impressions: 6400, ctr: 0.033, position: 11.4 }] });
  }
  send(res, 404, { error: 'not faked', path: p });
}).listen(PORT, () => console.log(`fake networks on http://localhost:${PORT}`));
