#!/usr/bin/env node
// MuzMesh brand check. Run on anything an AI (or a person) made:
//   node docs/brand/ai/check-brand.mjs page.html styles.css post.svg
// Flags colours outside the palette, fonts other than Inter Tight / JetBrains Mono,
// white text on orange, emoji, and banned words. Exit code 1 if anything is off-brand.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const allow = JSON.parse(readFileSync(resolve(here, 'brand-allowlist.json'), 'utf8'));
const okHex = new Set(allow.hex.map((h) => h.toUpperCase()));
const okFont = new Set(allow.fonts.map((f) => f.toLowerCase()));
const files = process.argv.slice(2);
if (!files.length) { console.log('usage: node check-brand.mjs <file> [...]'); process.exit(2); }

const expand = (h) => { h = h.slice(1).toUpperCase(); if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join(''); return '#' + h.slice(0, 6); };
const lineOf = (src, i) => src.slice(0, i).split('\n').length;
let problems = 0;

for (const f of files) {
  let src = readFileSync(f, 'utf8');
  // ignore embedded images and fonts
  src = src.replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g, (m) => ' '.repeat(m.length));
  const out = [];
  for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    if (![4, 5, 7, 9].includes(m[0].length)) continue;
    const pre = src.slice(Math.max(0, m.index - 12), m.index);
    if (/(href=["']|url\(|&)$/.test(pre) || /[\w-]$/.test(pre)) continue; // anchors, entities
    const h = expand(m[0]);
    if (!okHex.has(h)) out.push([lineOf(src, m.index), `colour ${m[0]} is not in the palette`]);
  }
  for (const m of src.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const h = '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('').toUpperCase();
    if (!okHex.has(h)) out.push([lineOf(src, m.index), `colour ${m[0]}…) is not in the palette`]);
  }
  for (const m of src.matchAll(/font-family\s*:\s*([^;}"]+)/g)) {
    for (const fam of m[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))) {
      if (fam && !fam.startsWith('var(') && !okFont.has(fam.toLowerCase())) out.push([lineOf(src, m.index), `font "${fam}" is not a brand font`]);
    }
  }
  for (const m of src.matchAll(/family=([A-Za-z+]+)/g)) {
    const fam = m[1].replace(/\+/g, ' ');
    if (!okFont.has(fam.toLowerCase())) out.push([lineOf(src, m.index), `loads font "${fam}"`]);
  }
  for (const m of src.matchAll(/background(?:-color)?\s*:\s*(#F2580F|#FF6A20|var\(--mm-(?:c-signal|accent)\))[^}]*?color\s*:\s*(#fff\b|#ffffff|white)/gi)) out.push([lineOf(src, m.index), 'white text on orange: use #0E0E10']);
  const text = src.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<[^>]+>/g, ' ');
  for (const m of text.matchAll(/\p{Extended_Pictographic}/gu)) out.push([lineOf(text, m.index), `emoji "${m[0]}"`]);
  const lower = text.toLowerCase();
  for (const w of allow.bannedWords) { let i = -1; while ((i = lower.indexOf(w, i + 1)) !== -1) out.push([lineOf(text, i), `banned phrase "${w}"`]); }
  const pri = (src.match(/class="[^"]*\bis-primary/g) || []).length;
  if (pri > 3) out.push([0, `${pri} primary buttons: keep one per view`]);

  out.sort((a, b) => a[0] - b[0]);
  if (out.length) { console.log(`\n${f}`); for (const [l, msg] of out) console.log(`  ${l ? 'line ' + l : 'file'}: ${msg}`); problems += out.length; }
  else console.log(`${f}: on brand`);
}
if (problems) { console.log(`\n${problems} off-brand item${problems === 1 ? '' : 's'}. Fix them using docs/brand/ai/BRAND.md.`); process.exit(1); }
