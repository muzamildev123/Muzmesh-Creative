// End-to-end smoke run against a running Launch Room (default http://localhost:4321) with the dev seed loaded.
//   npm run db:local && npm run seed:local && npm run dev      (in one terminal)
//   npm install --no-save playwright && node e2e/smoke.mjs      (in another)
// Drives a real browser through sign-in, the post approval flow, requests, the context pack and the
// AI connector (OAuth + MCP with the official SDK client). Exits non-zero on the first failure.
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const SHOTS = process.env.SHOTS_DIR ?? '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
let step = 0;
const ok = (cond, what) => { step++; if (!cond) throw new Error(`FAILED: ${what}`); console.log(`ok ${step} - ${what}`); };

const browser = await chromium.launch();
const problems = [];
const signIn = async (email, opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('status of 404')) problems.push(`${email}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${email}: ${e.message}`));
  await page.goto(`${BASE}/login`);
  await page.fill('#email', email);
  await page.click('main button[type=submit]');
  const link = page.locator('[data-testid=dev-link]');
  if (!(await link.count())) return { ctx, page, signedIn: false };
  await link.click();
  await page.click('main button[type=submit]');
  await page.waitForLoadState('networkidle');
  return { ctx, page, signedIn: true };
};
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const flash = (page) => page.locator('.lr-flash').innerText();

try {
  // ---- sign-in ----
  const stranger = await signIn('nobody@nowhere.test');
  ok(!stranger.signedIn, 'an unknown address gets no sign-in link');
  await stranger.page.goto(`${BASE}/w/bookly`);
  ok(stranger.page.url().includes('/login'), 'signed-out visitors are sent to sign in');

  const staff = await signIn('you@example.com');
  ok(staff.signedIn && staff.page.url().endsWith('/admin'), 'MuzMesh staff land on the all-clients page');
  await shot(staff.page, 'admin');
  const editor = await signIn('editor@bookly.test');
  ok(editor.page.url().endsWith('/w/bookly'), 'a client lands in their workspace');
  const owner = await signIn('owner@bookly.test');
  const viewer = await signIn('viewer@bookly.test');

  // ---- every tab renders ----
  for (const tab of ['', '/posts', '/calendar', '/requests', '/brand', '/context', '/connect', '/settings']) {
    const res = await staff.page.goto(`${BASE}/w/bookly${tab}`);
    ok(res.status() === 200, `staff can open /w/bookly${tab}`);
    await shot(staff.page, `staff${tab.replace('/', '-') || '-overview'}`);
  }
  ok((await (await editor.page.goto(`${BASE}/w/bookly/settings`)).status()) === 404, 'clients cannot open settings');
  ok((await (await editor.page.goto(`${BASE}/admin`)).status()) === 404, 'clients cannot open the admin area');

  // ---- tenant isolation ----
  await staff.page.goto(`${BASE}/admin/new`);
  await staff.page.fill('#name', 'Other Co');
  await staff.page.click('main button[type=submit]');
  ok(staff.page.url().endsWith('/w/other-co/settings'), 'staff can create a second workspace');
  ok((await (await editor.page.goto(`${BASE}/w/other-co`)).status()) === 404, 'a client gets 404 for a workspace they are not in');
  ok((await (await editor.page.goto(`${BASE}/w/other-co/posts/p-1`)).status()) === 404, 'and for its posts');
  ok((await (await staff.page.goto(`${BASE}/w/other-co/posts/p-1`)).status()) === 404, 'a post id from one workspace does not open under another');

  // ---- posts: write, brand check, review, approve, publish ----
  ok((await (await viewer.page.goto(`${BASE}/w/bookly/posts/new`)).status()) === 404, 'viewers cannot open the composer');
  const p = editor.page;
  await p.goto(`${BASE}/w/bookly/posts/new`);
  await p.fill('#copy', 'A seamless way to read.');
  await p.waitForSelector('[data-issues] li.is-error');
  ok((await p.locator('[data-issues]').innerText()).toLowerCase().includes('seamless'), 'the live brand check flags a banned phrase');
  await p.fill('#image_headline', 'Read less. Remember more.');
  await p.waitForSelector('[data-image-wrap]:not([hidden])');
  await p.waitForTimeout(600);
  await shot(p, 'composer');
  await p.click('main button[type=submit]');
  await p.waitForURL(/\/posts\/[0-9a-f-]{36}$/);
  const postUrl = p.url();
  await p.click('button[value=save_submit]');
  ok((await flash(p)).includes('Fix these first'), 'a post with a banned phrase cannot be sent for review');
  await p.fill('#copy', 'A calm way to read. Ten minutes, one book.');
  await p.click('button[value=save_submit]');
  ok((await flash(p)).includes('Sent for review'), 'a clean post is sent for review');
  ok((await p.locator('button[value=approve]').count()) === 0, 'editors do not get an Approve button');
  const forged = await p.evaluate(async () => (await fetch(location.href, { method: 'POST', body: new URLSearchParams({ action: 'approve' }) })).url);
  await p.goto(postUrl);
  ok((await p.locator('.lr-head').innerText()).includes('In review'), 'a forged approve request from an editor changes nothing');

  const o = owner.page;
  await o.goto(postUrl);
  await shot(o, 'review');
  await o.click('button[value=approve]');
  ok((await flash(o)).includes('Approved'), 'the owner approves');
  await p.goto(postUrl);
  await p.fill('#copy', 'A calm way to read. Ten minutes, one book. Edited.');
  await p.click('button[value=save]');
  ok((await flash(p)).includes('draft again'), 'editing an approved post sends it back to draft');
  await p.click('button[value=save_submit]');
  await o.goto(postUrl);
  await o.click('button[value=approve]');
  await p.goto(postUrl);
  await p.fill('#url', 'javascript:alert(1)');
  await p.evaluate(() => document.querySelector('#url').setAttribute('type', 'text'));
  await p.click('button[value=publish]');
  ok((await flash(p)).includes('https://'), 'a non-https "live link" is refused');
  await p.fill('#url', 'https://www.linkedin.com/posts/example');
  await p.click('button[value=publish]');
  ok((await flash(p)).includes('published'), 'the post is marked as published');
  await shot(p, 'published');

  // ---- requests and time ----
  await o.goto(`${BASE}/w/bookly/requests`);
  await o.fill('#title', 'Fix the footer link');
  await o.click('#new button[type=submit]');
  await o.waitForURL(/\/requests\/[0-9a-f-]{36}$/);
  const reqUrl = o.url();
  ok((await o.locator('#minutes').count()) === 0, 'clients cannot log time');
  await staff.page.goto(reqUrl);
  await staff.page.fill('#minutes', '25');
  await staff.page.click('button[value=time]');
  ok((await flash(staff.page)).includes('Time logged'), 'staff log time against a request');
  await o.goto(`${BASE}/w/bookly/requests`);
  ok((await o.locator('.lr-meter').innerText()).includes('1 h'), 'the hours meter adds it up (35 + 25 minutes)');

  // ---- context pack ----
  await o.goto(`${BASE}/w/bookly/context`);
  await o.fill('#claims', 'Rated 4.8 by 1200 readers (App Store, Nov 2026)');
  await o.click('main form button[type=submit]');
  ok((await flash(o)).includes('version 2'), 'saving the context pack makes a new version');
  const md = await (await o.request.get(`${BASE}/w/bookly/context/download?target=chatgpt`)).text();
  ok(md.includes('context pack v2') && md.includes('1200 readers') && md.includes('Never write'), 'the export holds the facts and the brand voice');
  ok((await viewer.page.goto(`${BASE}/w/bookly/context`)) && (await viewer.page.locator('#company').getAttribute('readonly')) !== null, 'viewers see the pack read-only');

  // ---- connector: OAuth, then MCP with the official client ----
  const meta = await (await fetch(`${BASE}/.well-known/oauth-protected-resource/mcp`)).json();
  const as = await (await fetch(`${meta.authorization_servers[0]}/.well-known/oauth-authorization-server`)).json();
  const redirect = 'http://localhost:9/callback';
  const reg = await (await fetch(as.registration_endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Smoke Test App', redirect_uris: [redirect] }) })).json();
  ok(!!reg.client_id, 'an AI app can register itself');
  const verifier = randomBytes(40).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const authUrl = `${as.authorization_endpoint}?${new URLSearchParams({ response_type: 'code', client_id: reg.client_id, redirect_uri: redirect, state: 'xyz', code_challenge: challenge, code_challenge_method: 'S256', resource: meta.resource })}`;
  const bad = await editor.page.goto(authUrl.replace(encodeURIComponent(redirect), encodeURIComponent('https://evil.example/cb')));
  ok((await editor.page.locator('h1').innerText()).includes('not valid') && bad.status() === 200, 'an unregistered return address is refused on screen, not redirected to');
  await editor.page.goto(authUrl);
  await shot(editor.page, 'consent');
  const [cb] = await Promise.all([
    editor.page.waitForRequest((r) => r.url().startsWith(redirect)),
    editor.page.click('button[value=allow]').catch(() => {}),
  ]);
  const back = new URL(cb.url());
  ok(back.searchParams.get('state') === 'xyz' && !!back.searchParams.get('code'), 'Allow returns a code to the app');
  const exchange = (body) => fetch(as.token_endpoint, { method: 'POST', body: new URLSearchParams(body) }).then((r) => r.json());
  const tok = await exchange({ grant_type: 'authorization_code', code: back.searchParams.get('code'), client_id: reg.client_id, redirect_uri: redirect, code_verifier: verifier });
  ok(!!tok.access_token && !!tok.refresh_token, 'the code is exchanged for tokens');

  ok((await fetch(`${BASE}/mcp`, { method: 'POST', body: '{}' })).status === 401, 'the connector refuses calls without a token');
  const client = new Client({ name: 'smoke', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), { requestInit: { headers: { authorization: `Bearer ${tok.access_token}` } } }));
  const tools = (await client.listTools()).tools.map((t) => t.name);
  ok(tools.includes('get_context') && tools.includes('create_post_draft') && !tools.some((t) => /approve|publish|delete/.test(t)), 'the official MCP client lists the tools, with no approve, publish or delete');
  const text = async (name, args = {}) => { const r = await client.callTool({ name, arguments: args }); return { text: r.content[0].text, isError: r.isError }; };
  ok((await text('get_context')).text.includes('1200 readers'), 'get_context returns the live pack');
  ok((await text('check_copy', { channel: 'x', copy: 'A revolutionary app' })).text.includes('revolutionary'), 'check_copy applies the brand rules');
  const draft = await text('create_post_draft', { channel: 'linkedin', copy: 'Saved highlights keeps every line you mark in one place.', scheduled_for: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10) });
  ok(!draft.isError && draft.text.includes('/w/bookly/posts/'), 'the AI saves a draft and gets a review link');
  await p.goto(`${BASE}/w/bookly/posts?status=draft`);
  ok((await p.locator('table').innerText()).includes('Drafted by AI'), 'the draft shows up in Launch Room, marked as drafted by AI');
  ok((await client.listPrompts()).prompts.length >= 2, 'prompts are offered');
  await client.close();

  const again = await exchange({ grant_type: 'authorization_code', code: back.searchParams.get('code'), client_id: reg.client_id, redirect_uri: redirect, code_verifier: verifier });
  ok(again.error === 'invalid_grant', 'a code cannot be used twice');
  ok((await fetch(`${BASE}/mcp`, { method: 'POST', headers: { authorization: `Bearer ${tok.access_token}` }, body: '{"jsonrpc":"2.0","id":1,"method":"ping"}' })).status === 401, 'and replaying it revokes the tokens it issued');

  // ---- phone layout ----
  const phone = await signIn('owner@bookly.test', { viewport: { width: 390, height: 844 } });
  for (const tab of ['', '/posts', '/calendar', '/requests', '/brand', '/context', '/connect']) {
    await phone.page.goto(`${BASE}/w/bookly${tab}`);
    const overflow = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflow <= 1, `no sideways scroll on a phone at /w/bookly${tab}`);
    await shot(phone.page, `phone${tab.replace('/', '-') || '-overview'}`);
  }

  ok(problems.length === 0, `no browser console errors${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  console.log(`\nAll ${step} checks passed.`);
} catch (e) {
  console.error(`\n${e.message}`);
  if (problems.length) console.error(`Console problems: ${problems.join(' | ')}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
