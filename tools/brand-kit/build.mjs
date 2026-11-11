#!/usr/bin/env node
// MuzMesh client brand kit generator.
//
//   node tools/brand-kit/build.mjs clients/<client>        build that client's kit into clients/<client>/kit/
//   node tools/brand-kit/build.mjs --new <client-slug>     start a new client from the Bookly example
//
// One config file (clients/<client>/brand.config.json) drives everything: the brand guideline page,
// tokens (CSS, JSON, Tailwind), components, logo files, icons, the social kit and the AI pack
// (BRAND.md, system prompt, starter page, brand checker, agent rule files). Contrast is checked and
// fixed automatically, so derived text colours always pass WCAG AA.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import components from './templates/components.css.mjs';
import guideline from './templates/guideline.mjs';
import brandMd from './templates/brand-md.mjs';
import starter from './templates/starter.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const args = process.argv.slice(2);

if (args[0] === '--new') {
  const slug = (args[1] || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!slug) { console.log('usage: node tools/brand-kit/build.mjs --new <client-slug>'); process.exit(2); }
  const dir = resolve(repo, 'clients', slug);
  if (existsSync(dir)) { console.log(`clients/${slug} already exists`); process.exit(1); }
  mkdirSync(resolve(dir, 'assets'), { recursive: true });
  const cfg = JSON.parse(readFileSync(resolve(repo, 'clients/bookly/brand.config.json'), 'utf8'));
  cfg.name = slug[0].toUpperCase() + slug.slice(1); cfg.legalName = cfg.name; cfg.prefix = slug.slice(0, 2); cfg.logo = { wordmark: { text: slug, font: 'display', weight: 600, tracking: '-0.03em' }, files: {} };
  writeFileSync(resolve(dir, 'brand.config.json'), JSON.stringify(cfg, null, 2) + '\n');
  console.log(`Created clients/${slug}/brand.config.json from the Bookly example.\nEdit it, put logo SVGs and photos in clients/${slug}/assets/, then run:\n  node tools/brand-kit/build.mjs clients/${slug}`);
  process.exit(0);
}

const clientDir = resolve(repo, args[0] || '');
if (!args[0] || !existsSync(resolve(clientDir, 'brand.config.json'))) { console.log('usage: node tools/brand-kit/build.mjs clients/<client>'); process.exit(2); }
const cfg = JSON.parse(readFileSync(resolve(clientDir, 'brand.config.json'), 'utf8'));
const p = (cfg.prefix || 'br').toLowerCase().replace(/[^a-z0-9]/g, '');
const dist = resolve(clientDir, 'kit');
rmSync(dist, { recursive: true, force: true });
const out = (rel, s) => { const f = resolve(dist, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); };

// ---------- colour maths ----------
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = hex(h).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (f, b) => { const [x, y] = [lum(f), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;
// move `start` towards `towards` until it reaches `target` contrast on `bg`
const reach = (start, towards, bg, target) => { for (let t = 0; t <= 1.0001; t += 0.02) { const c = mix(start, towards, t); if (ratio(c, bg) >= target) return c; } return towards; };

const C = cfg.colors;
const L = C.light.hex.toUpperCase(), D = C.dark.hex.toUpperCase(), TL = C.textOnLight.hex.toUpperCase(), TD = C.textOnDark.hex.toUpperCase(), A = C.accent.hex.toUpperCase();
const onAccent = [TL, D, '#FFFFFF', TD].sort((x, y) => ratio(y, A) - ratio(x, A))[0];
const onAccentIsLight = lum(onAccent) > lum(A);
const accentHover = onAccentIsLight ? mix(A, '#000000', 0.12) : mix(A, '#FFFFFF', 0.14);
const accentPress = onAccentIsLight ? mix(A, '#000000', 0.22) : mix(A, '#000000', 0.12);
const warnings = [];
if (ratio(onAccent, A) < 4.5) warnings.push(`Text on the accent only reaches ${ratio(onAccent, A).toFixed(2)}:1. Use buttons 18px+ bold, or pick a deeper or lighter accent.`);

const themes = {
  light: {
    bg: L, surface: mix(L, '#FFFFFF', 0.55), 'surface-2': mix(L, TL, 0.05),
    text: TL, 'text-muted': reach(mix(TL, L, 0.34), TL, L, 6), 'text-faint': reach(mix(TL, L, 0.5), TL, L, 4.6), 'text-dim': mix(TL, L, 0.55),
    hair: rgba(TL, 0.12), border: mix(L, TL, 0.22),
    accent: A, 'accent-hover': accentHover, 'accent-press': accentPress, 'on-accent': onAccent,
    'accent-text': reach(A, TL, L, 4.6), focus: reach(A, TL, L, 3.2),
    danger: '#B42318', success: '#1F7A35', 'btn-solid': TL, 'on-btn-solid': L,
  },
  dark: {
    bg: D, surface: mix(D, TD, 0.05), 'surface-2': mix(D, TD, 0.09),
    text: TD, 'text-muted': reach(mix(TD, D, 0.26), TD, D, 7), 'text-faint': reach(mix(TD, D, 0.44), TD, D, 4.8), 'text-dim': mix(TD, D, 0.5),
    hair: rgba(TD, 0.16), border: mix(D, TD, 0.3),
    accent: A, 'accent-hover': accentHover, 'accent-press': accentPress, 'on-accent': onAccent,
    'accent-text': reach(A, TD, D, 4.6), focus: reach(A, TD, D, 3.2),
    danger: '#FF7A59', success: '#6FDC8C', 'btn-solid': TD, 'on-btn-solid': D,
  },
};
const def = cfg.theme?.default === 'dark' ? 'dark' : 'light';
const alt = def === 'dark' ? 'light' : 'dark';

const core = [
  ['light', C.light], ['dark', C.dark], ['text-on-light', C.textOnLight], ['text-on-dark', C.textOnDark], ['accent', C.accent],
  ...(C.support || []).map((s) => [s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), s]),
].map(([k, v]) => ({ key: k, hex: v.hex.toUpperCase(), name: v.name, use: v.use }));

const pairs = [
  ['Text on light', 'text', 'bg', 'light', 'All text'], ['Muted on light', 'text-muted', 'bg', 'light', 'Paragraphs'], ['Faint on light', 'text-faint', 'bg', 'light', 'Labels, captions'],
  ['Accent text on light', 'accent-text', 'bg', 'light', 'Links, small accent text'],
  ['Text on dark', 'text', 'bg', 'dark', 'All text'], ['Muted on dark', 'text-muted', 'bg', 'dark', 'Paragraphs'], ['Faint on dark', 'text-faint', 'bg', 'dark', 'Labels, captions'],
  ['Accent text on dark', 'accent-text', 'bg', 'dark', 'Links, small accent text'],
  ['Button label on accent', 'on-accent', 'accent', 'light', 'Primary button'], ['Button label on hover', 'on-accent', 'accent-hover', 'light', 'Primary button, hover'],
].map(([name, f, b, t, use]) => { const F = themes[t][f], B = themes[t][b]; const r = ratio(F, B); return { name, fg: F, bg: B, r, ok: r >= 4.5, use }; });
for (const s of C.support || []) for (const t of ['light', 'dark']) { const r = ratio(s.hex, themes[t].bg); pairs.push({ name: `${s.name} on ${t}`, fg: s.hex.toUpperCase(), bg: themes[t].bg, r, ok: r >= 4.5, use: r >= 4.5 ? 'OK for text' : 'Decoration only, never text' }); }

// ---------- type, space, shape ----------
const F = cfg.fonts;
const stack = (f) => `"${f.family}", ${f.fallback || 'system-ui, sans-serif'}`;
const labelFont = F.label?.family ? F.label : { family: 'JetBrains Mono', fallback: 'ui-monospace, monospace', style: 'mono' };
const fonts = { display: stack(F.display), body: stack(F.body), label: stack(labelFont) };
const dTrack = F.display.tracking || '-0.02em';
const labelW = labelFont.weight || (labelFont.style === 'mono' ? 400 : 600);
const labelLs = labelFont.tracking || (labelFont.style === 'mono' ? '0.06em' : '0.08em');
const type = {
  display: ['clamp(40px, 5vw, 76px)', F.display.weights?.[0] || 500, 1.04, dTrack, 'display', 'One per page. Hero headline.'],
  h2: ['clamp(32px, 3.7vw, 54px)', F.display.weights?.[0] || 500, 1.06, dTrack, 'display', 'Section headline. Two-tone allowed.'],
  h3: ['clamp(26px, 2.6vw, 38px)', F.display.weights?.[0] || 500, 1.1, dTrack, 'display', 'Sub-section headline.'],
  h4: ['21px', 600, 1.25, '-0.01em', 'body', 'Card title.'],
  stat: ['clamp(44px, 4.6vw, 64px)', F.display.weights?.[0] || 500, 1, dTrack, 'display', 'Big numbers.'],
  lead: ['clamp(16px, 1.3vw, 19px)', 400, 1.55, '0', 'body', 'Paragraph under a headline. Max 40ch.'],
  'body-lg': ['17px', 400, 1.55, '0', 'body', 'Long reading.'],
  body: ['15px', 400, 1.55, '0', 'body', 'Default UI text.'],
  small: ['13px', 400, 1.45, '0', 'body', 'Captions, helper text.'],
  label: ['11.5px', labelW, 1.2, labelLs, 'label', 'UPPERCASE eyebrow with the marker.'],
  micro: ['10.5px', labelW, 1.2, '0.12em', 'label', 'UPPERCASE table headers and tags.'],
};
const radii = { sharp: [0, 2, 4, 6, 8, 10], soft: [2, 8, 12, 16, 18, 24], round: [4, 12, 18, 24, 28, 32] }[cfg.shape?.radius || 'soft'];
const radius = Object.fromEntries(['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((k, i) => [k, radii[i] + 'px']));
radius.btn = { pill: '999px', rounded: '12px', square: '2px' }[cfg.shape?.buttons || 'rounded'];
const space = { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 7: '32px', 8: '44px', 9: '56px', 10: '64px', 11: '96px', 12: '128px' };
const layout = { gutter: ['28px', 'Side padding'], content: ['1120px', 'Max width of section content'], frame: ['1440px', 'Max width of the nav and full-bleed frames'], 'nav-h': ['64px', 'Nav height'], 'section-pt': ['clamp(88px, 10vw, 144px)', 'Section padding top'], 'section-pb': ['clamp(88px, 9vw, 128px)', 'Section padding bottom'], 'col-gap': ['64px', 'Gap between two columns'] };
const motion = { 'dur-fast': ['150ms', 'Press'], 'dur-base': ['200ms', 'Hover, colour'], 'dur-slow': ['600ms', 'Reveals'], 'ease-out': ['cubic-bezier(.2,.7,.2,1)', 'Reveals, lifts'] };

const fontUrl = (() => {
  const fam = {};
  for (const f of [F.display, F.body, labelFont]) { const k = f.family; fam[k] = fam[k] || { w: new Set(), i: false }; for (const w of f.weights || [f.weight || 400]) fam[k].w.add(w); if (f.italic) fam[k].i = true; }
  fam[F.body.family].w.add(400); fam[F.body.family].w.add(600);
  const parts = Object.entries(fam).map(([k, v]) => { const ws = [...v.w].sort((a, b) => a - b); const name = k.replace(/ /g, '+'); return v.i ? `family=${name}:ital,wght@${ws.map((w) => '0,' + w).join(';')};${ws.map((w) => '1,' + w).join(';')}` : `family=${name}:wght@${ws.join(';')}`; });
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
})();

// ---------- tokens ----------
const roleVars = (r) => Object.entries(r).map(([k, v]) => `  --${p}-${k}: ${v};`).join('\n');
const typeVars = Object.entries(type).map(([k, [s, w, lh, ls]]) => `  --${p}-type-${k}: ${s};\n  --${p}-type-${k}-w: ${w};\n  --${p}-type-${k}-lh: ${lh};\n  --${p}-type-${k}-ls: ${ls};`).join('\n');
const tokensCss = `/* ${cfg.name} brand tokens ${cfg.version || ''}. Generated by tools/brand-kit from brand.config.json: edit the config, not this file.
   Default theme: ${def}. Set data-theme="${alt}" on <html> or any element to switch a subtree. */
:root {
${core.map((c) => `  --${p}-c-${c.key}: ${c.hex};`).join('\n')}

  --${p}-font-display: ${fonts.display};
  --${p}-font-body: ${fonts.body};
  --${p}-font-label: ${fonts.label};

${typeVars}

${Object.entries(space).map(([k, v]) => `  --${p}-space-${k}: ${v};`).join('\n')}
${Object.entries(layout).map(([k, [v]]) => `  --${p}-${k}: ${v};`).join('\n')}
${Object.entries(radius).map(([k, v]) => `  --${p}-radius-${k}: ${v};`).join('\n')}
${Object.entries(motion).map(([k, [v]]) => `  --${p}-${k}: ${v};`).join('\n')}

  /* ${def} theme (default) */
${roleVars(themes[def])}
}
[data-theme="${alt}"] {
${roleVars(themes[alt])}
}
[data-theme="${def}"] {
${roleVars(themes[def])}
}
`;
const tw = `/* Tailwind v4 theme for ${cfg.name}. Generated by tools/brand-kit. Import after tokens.css. */
@theme inline {
${Object.keys(themes.light).map((k) => `  --color-${p}-${k}: var(--${p}-${k});`).join('\n')}
  --font-display: var(--${p}-font-display);
  --font-sans: var(--${p}-font-body);
  --font-label: var(--${p}-font-label);
}
`;
const tokensJson = {
  $description: `${cfg.name} brand tokens ${cfg.version || ''}`,
  color: { core: Object.fromEntries(core.map((c) => [c.key, { $type: 'color', $value: c.hex, $description: c.use }])), light: Object.fromEntries(Object.entries(themes.light).map(([k, v]) => [k, { $type: 'color', $value: v }])), dark: Object.fromEntries(Object.entries(themes.dark).map(([k, v]) => [k, { $type: 'color', $value: v }])) },
  font: Object.fromEntries(Object.entries(fonts).map(([k, v]) => [k, { $type: 'fontFamily', $value: v }])),
  type: Object.fromEntries(Object.entries(type).map(([k, [s, w, lh, ls, f]]) => [k, { $type: 'typography', $value: { fontFamily: `{font.${f}}`, fontSize: s, fontWeight: w, lineHeight: lh, letterSpacing: ls } }])),
  radius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, { $type: 'dimension', $value: v }])),
  space: Object.fromEntries(Object.entries(space).map(([k, v]) => [k, { $type: 'dimension', $value: v }])),
};

// ---------- logo ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const W = cfg.logo?.wordmark || { text: cfg.name.toLowerCase(), font: 'display', weight: 600 };
const files = cfg.logo?.files || {};
const readAsset = (rel) => (rel ? readFileSync(resolve(clientDir, rel), 'utf8') : null);
const wmFont = W.font === 'body' ? F.body.family : F.display.family;
const textLogo = (fill, h = 40) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(W.text.length * 78 + 40)} 120" height="${h}" role="img" aria-label="${esc(cfg.name)}"><text x="0" y="92" font-family="'${wmFont}', ${esc(F.display.fallback || 'serif')}" font-weight="${W.weight || 600}" font-size="110" letter-spacing="${W.tracking || '-0.02em'}" fill="${fill}">${esc(W.text)}</text></svg>`;
const markLogo = (bg, fg, dot) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${esc(cfg.name)}"><rect width="512" height="512" rx="112" fill="${bg}"/><text x="236" y="352" text-anchor="middle" font-family="'${wmFont}', ${esc(F.display.fallback || 'serif')}" font-weight="${W.weight || 600}" font-size="330" fill="${fg}">${esc(W.text[0])}</text><circle cx="368" cy="330" r="30" fill="${dot}"/></svg>`;
const logo = {
  onLight: readAsset(files.onLight) || textLogo(TL),
  onDark: readAsset(files.onDark) || textLogo(TD),
  mark: readAsset(files.mark) || markLogo(D, TD, A),
  isText: !files.onLight,
};
const svgUri = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

// ---------- icons (shared MuzMesh line set, recoloured by currentColor) ----------
const iconDir = resolve(repo, 'docs/brand/icons');
const icons = Object.fromEntries(readdirSync(iconDir).filter((f) => f.endsWith('.svg')).map((f) => [basename(f, '.svg'), readFileSync(resolve(iconDir, f), 'utf8').trim()]));
const icon = (n) => icons[n] || '';

// ---------- images ----------
const imgs = (cfg.imagery?.images || []).filter((r) => existsSync(resolve(clientDir, r))).map((r) => ({ src: `data:image/${extname(r).slice(1).replace('jpg', 'jpeg')};base64,` + readFileSync(resolve(clientDir, r)).toString('base64'), file: r }));

// ---------- write everything ----------
const ctx = { cfg, p, themes, def, alt, core, pairs, type, fonts, fontUrl, radius, space, layout, motion, logo, svgUri, icons, icon, imgs, esc, warnings, labelFont, ratio, rgba, mix };
ctx.tokensCss = tokensCss;
ctx.componentsCss = components(p, { ...cfg, labelMarker: cfg.labelMarker || 'square' });
ctx.brandMd = brandMd(ctx);
ctx.systemPrompt = brandMd.prompt(ctx);
if (ctx.systemPrompt.length > 1500) warnings.push(`System prompt is ${ctx.systemPrompt.length} characters; ChatGPT custom instructions allow 1,500.`);

out('brand/tokens.css', tokensCss);
out('brand/components.css', ctx.componentsCss);
out('brand/tailwind-theme.css', tw);
out('brand/tokens.json', JSON.stringify(tokensJson, null, 2) + '\n');
out('brand/logo-on-light.svg', logo.onLight); out('brand/logo-on-dark.svg', logo.onDark); out('brand/logo-mark.svg', logo.mark);
for (const [k, v] of Object.entries(icons)) out(`brand/icons/${k}.svg`, v + '\n');
for (const im of cfg.imagery?.images || []) if (existsSync(resolve(clientDir, im))) { mkdirSync(resolve(dist, 'brand/images'), { recursive: true }); copyFileSync(resolve(clientDir, im), resolve(dist, 'brand/images', basename(im))); }

out('ai/BRAND.md', ctx.brandMd);
out('ai/system-prompt.txt', ctx.systemPrompt + '\n');
out('ai/starter.html', starter(ctx));
out('ai/brand-allowlist.json', JSON.stringify({
  hex: [...new Set([...core.map((c) => c.hex), ...Object.values(themes.light), ...Object.values(themes.dark)].filter((v) => v.startsWith('#')).concat(['#FFFFFF', '#000000']))],
  rgb: [TL, TD].map((h) => hex(h).join(',')),
  fonts: [...new Set([F.display.family, F.body.family, labelFont.family, ...[F.display.fallback, F.body.fallback, labelFont.fallback].join(',').split(',').map((s) => s.trim().replace(/["']/g, '')).filter(Boolean), 'inherit', 'system-ui', 'sans-serif', 'serif', 'monospace'])],
  bannedWords: [...new Set([...(cfg.voice?.avoid || []).map((w) => w.toLowerCase()), 'get started', 'learn more', 'click here'])],
  prefix: p,
}, null, 2) + '\n');
out('ai/check-brand.mjs', readFileSync(resolve(here, 'check-brand.mjs'), 'utf8'));

const agentNote = `Before you design or write anything for ${cfg.name} (a page, component, social post, deck, document, email or copy), read \`ai/BRAND.md\` and follow it exactly.

- Web pages: \`<body class="${p}">\`, load \`brand/tokens.css\` and \`brand/components.css\`, and copy patterns from \`ai/starter.html\`.
- Only the colours and fonts in BRAND.md. One primary (accent) button per view.
- Run \`node ai/check-brand.mjs <file>\` on what you made and fix everything it reports.
- The visual guideline is \`brand-guidelines.html\`.
`;
out('AGENTS.md', `# Instructions for AI agents\n\n${agentNote}`);
out('CLAUDE.md', `# Working on ${cfg.name}\n\n${agentNote}`);
out('.cursor/rules/brand.mdc', `---\ndescription: ${cfg.name} brand rules for any UI, page, post, deck, document or copy\nalwaysApply: true\n---\n${agentNote}`);
out('.github/copilot-instructions.md', agentNote);
out('README.md', readFileSync(resolve(here, 'templates/handover.md'), 'utf8').replace(/\{\{NAME\}\}/g, cfg.name).replace(/\{\{P\}\}/g, p));

const page = guideline(ctx);
out('brand-guidelines.html', page);
if (process.env.ARTIFACT_OUT) writeFileSync(process.env.ARTIFACT_OUT, page.replace(/^[\s\S]*?<head>\s*/, '').replace(/<\/head>\s*<body>/, '').replace(/<\/body>\s*<\/html>\s*$/, ''));

console.log(`${cfg.name}: wrote ${dist.replace(repo + '/', '')}/`);
console.log('contrast:');
for (const x of pairs) console.log(`  ${x.ok ? 'ok  ' : 'note'} ${x.r.toFixed(2)}  ${x.name}${x.ok ? '' : '  (' + x.use + ')'}`);
for (const w of warnings) console.log('  WARNING ' + w);
