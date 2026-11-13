// End-to-end run of the client admin: connecting X and LinkedIn, the assets library, the image maker,
// scheduling, approval, the scheduler posting, retries, short links and website stats.
// Needs the fake networks and a dev server pointed at them (see e2e/fake-networks.mjs), with a fresh seed:
//   node e2e/fake-networks.mjs &   npm run dev &   node e2e/publishing.mjs
import { mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const FAKE = process.env.FAKE_URL ?? 'http://localhost:4390';
const SHOTS = process.env.SHOTS_DIR ?? '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
let step = 0;
const ok = (cond, what) => { step++; if (!cond) throw new Error(`FAILED: ${what}`); console.log(`ok ${step} - ${what}`); };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const flash = (page) => page.locator('.lr-flash').innerText();
const calls = async () => (await fetch(`${FAKE}/_calls`)).json();

// A small real PNG (solid green, 64 x 48) for the upload.
const png = (w, h) => {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, Buffer.from([31, 122, 85]))])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
};
// "Now minus a few minutes" as the workspace sees it (Bookly's seed time zone is Asia/Karachi).
const karachi = (offsetMin) => {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(Date.now() + offsetMin * 60_000)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};

await fetch(`${FAKE}/_reset`);
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
  await page.click('[data-testid=dev-link]');
  await page.click('main button[type=submit]');
  await page.waitForLoadState('networkidle');
  return { ctx, page };
};

try {
  const staff = await signIn('you@example.com');
  const owner = await signIn('owner@bookly.test');
  const editor = await signIn('editor@bookly.test');
  const viewer = await signIn('viewer@bookly.test');
  const o = owner.page, e = editor.page, s = staff.page;

  // ---- the new layout ----
  for (const path of ['', '/posts', '/calendar', '/assets', '/assets/make', '/brand', '/site', '/requests', '/accounts', '/connect', '/context', '/settings']) {
    const res = await s.goto(`${BASE}/w/bookly${path}`);
    ok(res.status() === 200, `staff can open /w/bookly${path}`);
  }
  await o.goto(`${BASE}/w/bookly`);
  const tabs = await o.locator('.lr-tabs a, nav[aria-label="Workspace"] a').allInnerTexts();
  ok(['Overview', 'Posts', 'Calendar', 'Assets', 'Site', 'Accounts'].every((t) => tabs.some((x) => x.includes(t))), `the client sees the new tabs (${tabs.join(', ')})`);

  // ---- connecting accounts ----
  await viewer.page.goto(`${BASE}/w/bookly/accounts`);
  ok((await viewer.page.locator('a:has-text("Connect X")').count()) === 0, 'viewers do not get Connect buttons');
  ok((await (await viewer.page.goto(`${BASE}/w/bookly/accounts/connect/x`)).status()) === 404, 'and cannot start a connection by URL');
  ok((await (await e.goto(`${BASE}/w/bookly/accounts/connect/x`)).status()) === 404, 'editors cannot connect accounts either');
  await o.goto(`${BASE}/w/bookly/accounts`);
  await o.click('a:has-text("Connect X")');
  await o.waitForURL(/\/w\/bookly\/accounts$/);
  ok((await flash(o)).includes('@booklyapp'), 'the owner connects X and comes back to Accounts');
  await o.click('a:has-text("Connect LinkedIn")');
  await o.waitForURL(/\/w\/bookly\/accounts$/);
  ok((await flash(o)).includes('Demo Owner'), 'and LinkedIn');
  ok((await o.locator('main').innerText()).includes('Bookly') && (await o.locator('main li').count()) >= 2, 'both accounts are listed');
  await shot(o, 'accounts');
  const tokenCall = (await calls()).find((c) => c.path === '/2/oauth2/token');
  ok(!!tokenCall?.body?.code_verifier, 'X was connected with PKCE');
  const forged = await o.goto(`${BASE}/connect/x/callback?state=forged&code=x`);
  ok(forged.url().endsWith('/') || forged.url().includes('/w/'), 'a forged callback goes nowhere');

  // ---- assets library ----
  await e.goto(`${BASE}/w/bookly/assets`);
  await e.setInputFiles('#file', { name: 'reading-corner.png', mimeType: 'image/png', buffer: png(64, 48) });
  await e.fill('#tags', 'photo, launch');
  await e.fill('#alt', 'A green square standing in for a photo');
  await e.click('form[enctype] button[type=submit]');
  ok((await flash(e)).includes('Added 1 file'), 'an editor uploads a picture');
  await e.setInputFiles('#file', { name: 'evil.png', mimeType: 'image/png', buffer: Buffer.from('<script>alert(1)</script>') });
  await e.click('form[enctype] button[type=submit]');
  ok((await flash(e)).includes('not what its name says'), 'a file pretending to be a PNG is refused');
  const img = e.locator('.lr-asset img').first();
  await img.waitFor();
  ok(await img.evaluate((el) => el.complete && el.naturalWidth === 64), 'the picture is served back to members');
  const fileUrl = await img.getAttribute('src');
  const outsider = await browser.newContext();
  const anon = await outsider.request.get(`${BASE}${fileUrl}`, { maxRedirects: 0 });
  ok(anon.status() === 303 || anon.status() === 302, 'and not to anyone signed out');
  const head = await e.request.get(`${BASE}${fileUrl}`);
  ok((head.headers()['content-security-policy'] ?? '').includes('sandbox'), 'files are served sandboxed');
  await e.click('a:has-text("photo")');
  ok((await e.locator('.lr-asset').count()) === 1, 'the tag filter works');
  await shot(e, 'assets');

  // ---- image maker ----
  await e.goto(`${BASE}/w/bookly/assets/make`);
  await e.fill('#image_headline', 'Ten minutes. One chapter.');
  await e.fill('#tags', 'social');
  await e.waitForTimeout(500);
  await shot(e, 'maker');
  await e.click('[data-save]');
  await e.waitForSelector('[data-maker-status] a');
  ok((await e.locator('[data-maker-status]').innerText()).includes('Saved to the library'), 'the image maker saves a branded PNG to the library');
  await e.goto(`${BASE}/w/bookly/assets`);
  ok((await e.locator('.lr-asset').count()) === 2 && (await e.locator('.lr-asset').first().innerText()).includes('Made here'), 'the made image is in the library');

  // ---- schedule an automatic X post with a template image ----
  const due = karachi(-3);
  await e.goto(`${BASE}/w/bookly/posts/new`);
  await e.selectOption('#channel', 'x');
  ok(await e.locator('#social_account_id option[data-network=linkedin]').evaluate((el) => el.disabled), 'only X accounts can be picked for an X post');
  await e.fill('#copy', 'Ten minutes a day, one chapter at a time. Try it: https://bookly.app/pricing');
  await e.fill('#scheduled_for', due.day);
  await e.fill('#scheduled_time', due.time);
  await e.selectOption('#social_account_id', { label: 'Automatically on X as Bookly' });
  await e.fill('#image_headline', 'One chapter at a time');
  await Promise.all([e.waitForNavigation(), e.click('main button[type=submit]')]);
  if (e.url().endsWith('/new')) throw new Error(`FAILED: saving the scheduled post: ${await flash(e)}`);
  const postUrl = e.url();
  await e.waitForFunction(() => document.querySelector('[data-render-status]')?.textContent?.includes('ready'));
  ok(true, 'the template image is drawn and stored for the scheduler');
  ok((await e.locator('#auto-h').count()) === 1 && (await e.locator('main').innerText()).includes('Goes out on X as Bookly'), 'the post says where and when it will go out');
  await e.click('button[value=save_submit]');
  ok((await flash(e)).includes('Sent for review'), 'sent for review');
  await o.goto(postUrl);
  await o.click('button[value=approve]');
  ok((await flash(o)).includes('Approved'), 'the owner approves it');
  await shot(o, 'post-scheduled');
  ok((await calls()).filter((c) => c.path === '/2/tweets').length === 0, 'nothing was posted before the scheduler ran');

  // ---- the scheduler ----
  await s.goto(`${BASE}/admin`);
  await s.click('button[value=run_scheduler]');
  ok((await flash(s)).includes('1 posted'), 'the scheduler posts it');
  const log = await calls();
  const tweet = log.find((c) => c.path === '/2/tweets');
  ok(!!log.find((c) => c.path === '/2/media/upload') && tweet?.body?.media?.media_ids?.[0] === 'media-1', 'with the image attached');
  const short = /http:\/\/localhost:4321\/l\/([a-zA-Z0-9]+)/.exec(tweet.body.text);
  ok(!!short && !tweet.body.text.includes('bookly.app/pricing'), 'and the link swapped for a tracked short link');
  await e.goto(postUrl);
  ok((await e.locator('.lr-head').innerText()).includes('Published') && (await e.locator('a:has-text("Open the live post")').getAttribute('href')).startsWith('https://x.com/booklyapp/status/'), 'the post shows as published with its link');
  ok((await e.locator('.lr-history').innerText()).includes('Posted automatically'), 'and the history says so');
  await s.click('button[value=run_scheduler]');
  ok((await flash(s)).includes('nothing was due'), 'running again does not post twice');

  // ---- short link clicks ----
  const human = await browser.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15' });
  const r1 = await human.request.get(short[0], { maxRedirects: 0 });
  ok(r1.status() === 302 && r1.headers().location === 'https://bookly.app/pricing', 'the short link sends people to the page');
  const bot = await browser.newContext({ userAgent: 'LinkedInBot/1.0 (compatible; Mozilla/5.0)' });
  await bot.request.get(short[0], { maxRedirects: 0 });
  ok((await (await human.request.get(`${BASE}/l/nope!`, { maxRedirects: 0 })).status()) === 404, 'unknown short links are 404');

  // ---- a failure, a retry and the alert ----
  const due2 = karachi(-1);
  await e.goto(`${BASE}/w/bookly/posts/new`);
  await e.selectOption('#channel', 'x');
  await e.fill('#copy', 'Finish the book you started in March.');
  await e.fill('#scheduled_for', due2.day);
  await e.fill('#scheduled_time', due2.time);
  await e.selectOption('#social_account_id', { label: 'Automatically on X as Bookly' });
  await e.click('main button[type=submit]');
  await e.waitForURL(/\/posts\/[0-9a-f-]{36}$/);
  const post2 = e.url();
  await e.click('button[value=save_submit]');
  await o.goto(post2);
  await o.click('button[value=approve]');
  await fetch(`${FAKE}/_fail-tweets?n=1`);
  await s.goto(`${BASE}/admin`);
  await s.click('button[value=run_scheduler]');
  ok((await flash(s)).includes('1 will retry'), 'when X is down the scheduler keeps it for a retry');
  ok((await s.locator('#posting').innerText()).includes('Retrying'), 'MuzMesh sees it on the admin page');
  await o.goto(post2);
  ok((await o.locator('main').innerText()).includes('will try again'), 'and the post page says it will try again');
  o.once('dialog', (d) => d.accept());
  await o.click('button[value=post_now]');
  ok((await flash(o)).includes('Posted'), '"Post now" sends it straight away once X is back');

  // ---- website stats ----
  await s.goto(`${BASE}/w/bookly/settings`);
  await s.fill('#ga4_property_id', '412345678');
  await s.fill('#search_console_site', 'sc-domain:bookly.app');
  await s.click('button[value=workspace]');
  ok((await flash(s)).includes('Settings saved'), 'staff add the Google Analytics and Search Console properties');
  ok((await s.locator('#admin-link').innerText()).includes('bookly.app/admin'), 'settings show the bookly.app/admin redirect');
  ok((await s.locator('#admin-link pre').first().textContent()).includes('/w/bookly'), 'with a ready-to-paste snippet');
  await s.click('button[value=stats]');
  ok((await flash(s)).includes('Stats refreshed'), 'stats refresh on demand');
  await o.goto(`${BASE}/w/bookly`);
  const ov = await o.locator('main').innerText();
  ok(ov.includes('1,830') && ov.includes('212'), 'the Overview shows visitors and Google clicks');
  ok(/Clicks on post links\s*1\b/.test(ov), 'and one human click on the short link (the bot was not counted)');
  ok(ov.includes('/pricing') && ov.includes('ai reading app'), 'with top pages and searches');
  ok((await o.locator('.lr-spark svg').count()) === 1, 'and a daily visitors line');
  await shot(o, 'overview');

  // ---- disconnect ----
  await o.goto(`${BASE}/w/bookly/accounts`);
  o.once('dialog', (d) => d.accept());
  await o.locator('li:has-text("Demo Owner") button:has-text("Disconnect")').click();
  ok((await flash(o)).includes('Disconnected'), 'an owner can disconnect an account');

  // ---- phone layout ----
  const phone = await signIn('owner@bookly.test', { viewport: { width: 390, height: 844 } });
  for (const path of ['', '/assets', '/assets/make', '/site', '/accounts', `/posts/${postUrl.split('/').pop()}`]) {
    await phone.page.goto(`${BASE}/w/bookly${path}`);
    const overflow = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(overflow <= 1, `no sideways scroll on a phone at /w/bookly${path}`);
    await shot(phone.page, `phone${path.replace(/\//g, '-') || '-overview'}`);
  }

  ok(problems.length === 0, `no browser console errors${problems.length ? `: ${problems.join(' | ')}` : ''}`);
  console.log(`\nAll ${step} checks passed.`);
} catch (err) {
  console.error(`\n${err.message}`);
  if (problems.length) console.error(`Console problems: ${problems.join(' | ')}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
