// Accessibility pass with axe-core over every screen, as MuzMesh staff and as a client owner.
//   npm install --no-save playwright axe-core && node e2e/a11y.mjs      (with the app running and seeded)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const browser = await chromium.launch();
let bad = 0;
const run = async (email, paths, viewport) => {
  const ctx = await browser.newContext({ viewport, bypassCSP: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await scan(page, '/login');
  await page.fill('#email', email);
  await page.click('main button[type=submit]');
  await page.click('[data-testid=dev-link]');
  await scan(page, '/auth/verify');
  await page.click('main button[type=submit]');
  for (const path of paths) { await page.goto(`${BASE}${path}`); await scan(page, path); }
  await ctx.close();
};
const scan = async (page, path) => {
  await page.waitForLoadState('networkidle');
  await page.evaluate(axe);
  const r = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
  for (const v of r.violations) { bad++; console.log(`${path}: ${v.id} (${v.impact}) ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n   ')}`); }
};
const ws = ['', '/posts', '/posts/new', '/posts/p-1', '/posts/p-3', '/calendar', '/assets', '/assets/make', '/site', '/requests', '/requests/r-1', '/brand', '/accounts', '/context', '/connect'].map((p) => `/w/bookly${p}`);
await run('you@example.com', ['/admin', '/admin/new', '/admin/calendar', ...ws, '/w/bookly/settings', '/nope'], { width: 1280, height: 900 });
await run('owner@bookly.test', ws, { width: 390, height: 844 });
await browser.close();
console.log(bad ? `\n${bad} accessibility problems.` : '\nNo accessibility problems found by axe.');
process.exitCode = bad ? 1 : 0;
