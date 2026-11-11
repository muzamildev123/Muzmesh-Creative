// MuzMesh brand tokens: the single source of truth.
// Run `node docs/brand/build-tokens.mjs` after changing anything here. It writes:
//   docs/brand/muzmesh-tokens.json   (W3C design-tokens format, for Figma / Tokens Studio / other tools)
//   docs/brand/tokens.css            (CSS custom properties, both themes)
//   web/src/styles/tokens.css        (the same file, imported by the Astro site)
//   docs/brand/tailwind-theme.css    (Tailwind v4 @theme block that points at the CSS variables)
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

// ---------- 1. Core palette (raw values; never use these names in components, use the semantic roles below) ----------
const core = {
  black:        ['#000000', 'Page background in the Launch theme. Pure black, not near-black.'],
  'raise-1':    ['#0E0E10', 'Raised panel on black: FAQ answer, referral bench, done states.'],
  'raise-2':    ['#141418', 'Inset surface on black: browser windows, inputs, menus.'],
  graphite:     ['#2C2C35', 'Solid border on black, when a hairline needs to be opaque.'],
  bone:         ['#F4F4F1', 'Text and white buttons on black. Warm off-white, never pure #fff for text.'],
  stone:        ['#BDBDB8', 'Display-only grey for the giant footer wordmark and similar art. Not for text under 32px.'],
  ash:          ['#77777C', 'Dimmed first line of a two-tone headline ("Every AI startup looks the same.").'],
  paper:        ['#F3F0E8', 'Page background in the Paper theme; the launch pass ticket.'],
  'paper-2':    ['#E8E4D9', 'Header strip on paper, pressed paper.'],
  'paper-card': ['#FBFAF6', 'Card on paper.'],
  'paper-line': ['#D9D4C7', 'Border on paper.'],
  ink:          ['#1D1D1F', 'Text on paper.'],
  'on-accent':  ['#0E0E10', 'Text and icons on an orange fill. Always this, never white.'],
  signal:       ['#F2580F', 'The MuzMesh orange. Fills, bullets, focus rings, one CTA per view.'],
  'signal-hot': ['#FF6A20', 'Hover on orange fills (lighter, keeps contrast with the dark label).'],
  'signal-deep':['#CC3D08', 'Pressed orange, and decorative orange in gradients. Not behind text.'],
  'signal-ink': ['#B33A06', 'Orange used as text or thin lines on paper or white (5.2:1 on paper).'],
  'danger-dark':['#FF7A59', 'Error text on black.'],
  'danger-light':['#B42318', 'Error text on paper.'],
  'success-dark':['#6FDC8C', 'Confirmation text on black.'],
  'success-light':['#1F7A35', 'Confirmation text on paper.'],
};

// ---------- 2. Semantic roles per theme (components use these) ----------
const themes = {
  launch: {
    _desc: 'Default. Black page, bone text, one orange accent. The website, social posts, decks.',
    bg: 'black', surface: 'raise-1', 'surface-2': 'raise-2',
    text: 'bone', 'text-muted': 'rgba(244,244,241,.74)', 'text-faint': 'rgba(244,244,241,.56)', 'text-dim': 'ash',
    hair: 'rgba(244,244,241,.16)', border: 'rgba(244,244,241,.30)', 'border-solid': 'graphite',
    accent: 'signal', 'accent-hover': 'signal-hot', 'accent-press': 'signal-deep', 'on-accent': 'on-accent',
    'accent-text': 'signal', focus: 'signal',
    danger: 'danger-dark', success: 'success-dark',
    'btn-primary': 'bone', 'on-btn-primary': '#000000',
  },
  paper: {
    _desc: 'Light. Paper page, ink text. Proposals, invoices, the launch pass, long-form pages, print.',
    bg: 'paper', surface: 'paper-card', 'surface-2': 'paper-2',
    text: 'ink', 'text-muted': '#595857', 'text-faint': '#686764', 'text-dim': '#8A8884',
    hair: 'rgba(29,29,31,.12)', border: 'paper-line', 'border-solid': 'paper-line',
    accent: 'signal', 'accent-hover': 'signal-hot', 'accent-press': 'signal-deep', 'on-accent': 'on-accent',
    'accent-text': 'signal-ink', focus: 'signal-ink',
    danger: 'danger-light', success: 'success-light',
    'btn-primary': 'ink', 'on-btn-primary': 'paper',
  },
};

// ---------- 3. Type, space, radius, shadow, motion ----------
const font = {
  sans: ['"Inter Tight", "Inter", system-ui, sans-serif', 'The only brand typeface. Weights 400, 500, 600, 700.'],
  mono: ['"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace', 'Labels, data, timestamps, build logs. Weights 400, 500.'],
};
// [size, weight, line-height, letter-spacing, family, note]
const type = {
  display: ['clamp(40px, 4.5vw, 70px)', 500, 1.06, '-0.025em', 'sans', 'One per page. Hero headline.'],
  h2:      ['clamp(34px, 3.7vw, 56px)', 500, 1.04, '-0.03em',  'sans', 'Section headline. Two-tone allowed: dim the first part with --mm-text-faint.'],
  h3:      ['clamp(28px, 2.75vw, 42px)', 500, 1.08, '-0.028em', 'sans', 'Sub-section headline.'],
  h4:      ['22px', 600, 1.2, '-0.015em', 'sans', 'Card title.'],
  stat:    ['clamp(44px, 4.6vw, 64px)', 500, 1, '-0.04em', 'sans', 'Big numbers: $500, 5 days, 40%.'],
  lead:    ['clamp(16px, 1.25vw, 18px)', 400, 1.55, '0', 'sans', 'Paragraph under a headline. Max 40ch. Colour --mm-text-muted.'],
  'body-lg': ['17px', 400, 1.5, '-0.01em', 'sans', 'Long reading, FAQ questions, articles.'],
  body:    ['15px', 400, 1.5, '0', 'sans', 'Default UI text.'],
  small:   ['13px', 400, 1.45, '0', 'sans', 'Captions, chips, helper text.'],
  label:   ['11.5px', 400, 1.2, '0.06em', 'mono', 'UPPERCASE eyebrow with the orange square bullet.'],
  micro:   ['10.5px', 500, 1.2, '0.12em', 'mono', 'UPPERCASE ticket and table headers.'],
  wordmark:['22px', 700, 1, '-0.015em', 'sans', 'Text wordmark in the nav. Lowercase.'],
};
const space = { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 7: '32px', 8: '44px', 9: '56px', 10: '64px', 11: '96px', 12: '128px' };
const layout = {
  'gutter': ['28px', 'Side padding on every screen size (respect safe areas).'],
  'content': ['1120px', 'Max width of section content.'],
  'frame': ['1640px', 'Max width of the nav and full-bleed frames.'],
  'nav-h': ['64px', 'Nav bar height.'],
  'section-pt': ['clamp(96px, 11vw, 160px)', 'Section padding top.'],
  'section-pb': ['clamp(96px, 10vw, 140px)', 'Section padding bottom.'],
  'col-gap': ['64px', 'Gap between a section\'s two columns.'],
};
const radius = { xs: ['2px', 'Editorial buttons inside client work only'], sm: ['9px', 'Small tiles, day cells'], md: ['12px', 'Browser windows, image frames'], lg: ['16px', 'Panels and benches'], xl: ['18px', 'Ticket / launch pass'], '2xl': ['28px', 'Large input boxes'], pill: ['999px', 'Buttons, chips, the prompt bar'] };
const shadow = {
  ring: ['inset 0 0 0 1px rgba(244,244,241,.14)', 'Hairline outline drawn inside (chips, panels on black).'],
  window: ['0 0 0 1px rgba(244,244,241,.14), 0 40px 100px -30px rgba(0,0,0,.95)', 'Browser windows and floating frames.'],
  glow: ['0 18px 50px -14px rgba(242,88,15,.6)', 'Under the one primary orange button. Never on anything else.'],
  focus: ['0 0 0 4px rgba(242,88,15,.14)', 'Soft halo on focused inputs, with a 1px orange inset ring.'],
};
const motion = {
  'dur-fast': ['150ms', 'Press, lift'], 'dur-base': ['200ms', 'Colour and hover'], 'dur-slow': ['700ms', 'Reveals'],
  'ease-out': ['cubic-bezier(.2,.7,.2,1)', 'Reveals and lifts'], 'ease-in-out': ['cubic-bezier(.45,0,.55,1)', 'Blinks and loops'],
};

// ---------- writers ----------
const resolveColor = (v) => (core[v] ? core[v][0] : v);
const tok = (type, value, description) => ({ $type: type, $value: value, ...(description ? { $description: description } : {}) });

const json = {
  $description: 'MuzMesh brand tokens v2 (Nov 2026). Generated by docs/brand/build-tokens.mjs. Do not edit by hand.',
  color: {
    core: Object.fromEntries(Object.entries(core).map(([k, [v, d]]) => [k, tok('color', v, d)])),
    ...Object.fromEntries(Object.entries(themes).map(([t, roles]) => [t, {
      $description: roles._desc,
      ...Object.fromEntries(Object.entries(roles).filter(([k]) => k !== '_desc').map(([k, v]) => [k, tok('color', core[v] ? `{color.core.${v}}` : v)])),
    }])),
  },
  font: { family: Object.fromEntries(Object.entries(font).map(([k, [v, d]]) => [k, tok('fontFamily', v, d)])) },
  typography: Object.fromEntries(Object.entries(type).map(([k, [s, w, lh, ls, fam, d]]) => [k, tok('typography', { fontFamily: `{font.family.${fam}}`, fontSize: s, fontWeight: w, lineHeight: lh, letterSpacing: ls }, d)])),
  space: Object.fromEntries(Object.entries(space).map(([k, v]) => [k, tok('dimension', v)])),
  layout: Object.fromEntries(Object.entries(layout).map(([k, [v, d]]) => [k, tok('dimension', v, d)])),
  radius: Object.fromEntries(Object.entries(radius).map(([k, [v, d]]) => [k, tok('dimension', v, d)])),
  shadow: Object.fromEntries(Object.entries(shadow).map(([k, [v, d]]) => [k, tok('shadow', v, d)])),
  motion: Object.fromEntries(Object.entries(motion).map(([k, [v, d]]) => [k, tok(k.startsWith('dur') ? 'duration' : 'cubicBezier', v, d)])),
};

const roleVars = (roles) => Object.entries(roles).filter(([k]) => k !== '_desc').map(([k, v]) => `  --mm-${k}: ${resolveColor(v)};`).join('\n');
const css = `/* MuzMesh brand tokens v2. Generated by docs/brand/build-tokens.mjs: edit that file, not this one.
   Two themes: Launch (default, dark) and Paper (light). Set data-theme="paper" on <html> or any element to switch a subtree.
   Components use the --mm-* role tokens; the --mm-c-* core values are for art and one-off illustrations only. */
:root {
${Object.entries(core).map(([k, [v]]) => `  --mm-c-${k}: ${v};`).join('\n')}

  /* fonts */
${Object.entries(font).map(([k, [v]]) => `  --mm-font-${k}: ${v};`).join('\n')}

  /* type scale: size / weight / line-height / tracking */
${Object.entries(type).map(([k, [s, w, lh, ls]]) => `  --mm-type-${k}: ${s}; --mm-type-${k}-w: ${w}; --mm-type-${k}-lh: ${lh}; --mm-type-${k}-ls: ${ls};`).join('\n')}

  /* space (4px base) */
${Object.entries(space).map(([k, v]) => `  --mm-space-${k}: ${v};`).join('\n')}

  /* layout */
${Object.entries(layout).map(([k, [v]]) => `  --mm-${k}: ${v};`).join('\n')}

  /* radius */
${Object.entries(radius).map(([k, [v]]) => `  --mm-radius-${k}: ${v};`).join('\n')}

  /* shadow */
${Object.entries(shadow).map(([k, [v]]) => `  --mm-shadow-${k}: ${v};`).join('\n')}

  /* motion */
${Object.entries(motion).map(([k, [v]]) => `  --mm-${k}: ${v};`).join('\n')}
}

/* Launch theme (default) */
:root, [data-theme="launch"] {
  color-scheme: dark;
${roleVars(themes.launch)}
}

/* Paper theme */
[data-theme="paper"] {
  color-scheme: light;
${roleVars(themes.paper)}
}

@media (prefers-reduced-motion: reduce) {
  :root { --mm-dur-fast: 0ms; --mm-dur-base: 0ms; --mm-dur-slow: 0ms; }
}
`;

const tw = `/* Tailwind v4 theme for MuzMesh. Generated by docs/brand/build-tokens.mjs.
   Import after tokens.css. Utilities follow the theme of the element they sit in: bg-mm-bg, text-mm-muted, border-mm-hair, bg-mm-accent text-mm-on-accent ... */
@theme inline {
  --font-sans: var(--mm-font-sans);
  --font-mono: var(--mm-font-mono);
${Object.keys(themes.launch).filter((k) => k !== '_desc').map((k) => `  --color-mm-${k.replace(/^text-/, '')}: var(--mm-${k});`).join('\n')}
${Object.keys(radius).map((k) => `  --radius-mm-${k}: var(--mm-radius-${k});`).join('\n')}
  --shadow-mm-window: var(--mm-shadow-window);
  --shadow-mm-glow: var(--mm-shadow-glow);
  --ease-mm-out: var(--mm-ease-out);
}
`;

const out = (p, s) => { const f = resolve(root, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); console.log('wrote', p); };
out('docs/brand/muzmesh-tokens.json', JSON.stringify(json, null, 2) + '\n');
out('docs/brand/tokens.css', css);
out('web/src/styles/tokens.css', css);
out('docs/brand/tailwind-theme.css', tw);

// brand.css lives with the site; keep a copy next to the guideline so docs/brand/ is self-contained.

out('docs/brand/brand.css', readFileSync(resolve(root, 'web/src/styles/brand.css'), 'utf8'));

// ---------- the guideline page (docs/brand/brand-guidelines.html) ----------
// Built from guideline.src.html with every table, swatch and contrast ratio computed from the values above,
// so the guideline can never drift from the tokens.
const hex2rgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const parseColor = (c, under = '#000000') => {
  c = resolveColor(c);
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return hex2rgb(c);
  const [r, g, b, a = 1] = m[1].split(',').map(Number);
  const u = hex2rgb(resolveColor(under));
  return [r, g, b].map((v, i) => Math.round(a * v + (1 - a) * u[i]));
};
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (fg, bg) => { const b = parseColor(bg); const f = parseColor(fg, bg); const [x, y] = [lum(f), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const swatch = (theme, roles) => roles.map(([role, note]) => {
  const v = themes[theme][role]; const shown = resolveColor(v);
  const bg = parseColor(v, themes[theme].bg); const dark = lum(bg) < 0.25;
  return `<div class="g-chip"><div class="s" style="background:${shown};color:${dark ? '#f4f4f1' : '#1d1d1f'};${role === 'bg' ? 'box-shadow:inset 0 0 0 1px rgba(244,244,241,.18);border-radius:14px 14px 0 0' : ''}"><span>${core[v] ? v : ''}</span><span>${esc(shown.toUpperCase().startsWith('RGBA') ? shown : shown.toUpperCase())}</span></div><div class="t"><b>${role}</b><code>--mm-${role}</code><span>${esc(note)}</span></div></div>`;
}).join('');
const launchSw = swatch('launch', [
  ['bg', 'Page. Pure black.'], ['surface', 'Raised panels and benches.'], ['surface-2', 'Windows, inputs, menus.'],
  ['text', 'Headlines, body, white buttons.'], ['text-muted', 'Leads and paragraphs.'], ['text-faint', 'Labels, captions, dim half of headlines.'],
  ['hair', 'Dividers between rows and sections.'], ['accent', 'The one CTA, label squares, focus.'], ['accent-hover', 'Hover on orange.'],
]);
const paperSw = swatch('paper', [
  ['bg', 'Page and ticket paper.'], ['surface', 'Cards on paper.'], ['surface-2', 'Header strips, table heads.'],
  ['text', 'Ink.'], ['text-muted', 'Paragraphs and small print.'], ['border', 'Lines on paper.'],
  ['accent', 'Orange fills (with dark text).'], ['accent-text', 'Orange as text or thin lines.'], ['danger', 'Errors.'],
]);

const pairs = [
  ['Bone on black', 'text', 'bg', 'launch', 'All text'],
  ['Muted on black', 'text-muted', 'bg', 'launch', 'Leads, paragraphs'],
  ['Faint on black', 'text-faint', 'bg', 'launch', 'Labels, captions'],
  ['Faint on raised panel', 'text-faint', 'surface', 'launch', 'Labels inside panels'],
  ['Orange on black', 'accent', 'bg', 'launch', 'Orange text, icons, focus ring'],
  ['Dark on orange', 'on-accent', 'accent', 'launch', 'Primary button label'],
  ['Dark on orange hover', 'on-accent', 'accent-hover', 'launch', 'Primary button, hover'],
  ['White on orange', '#ffffff', 'accent', 'launch', 'Never'],
  ['Error on black', 'danger', 'bg', 'launch', 'Form errors'],
  ['Ink on paper', 'text', 'bg', 'paper', 'All text'],
  ['Muted on paper', 'text-muted', 'bg', 'paper', 'Paragraphs, ticket labels'],
  ['Faint on paper', 'text-faint', 'bg', 'paper', 'Captions'],
  ['Signal-ink on paper', 'accent-text', 'bg', 'paper', 'Orange text on light'],
  ['Orange on paper', 'accent', 'bg', 'paper', 'Never as text'],
];
const contrastRows = pairs.map(([name, fg, bg, t, use]) => {
  const F = themes[t][fg] ?? fg; const B = themes[t][bg] ?? bg;
  const r = ratio(F, B); const ok = r >= 4.5; const fgShown = `rgb(${parseColor(F, B).join(',')})`;
  return `<tr><td>${name}</td><td><span class="g-pair" style="background:${resolveColor(B)};color:${fgShown};box-shadow:inset 0 0 0 1px rgba(244,244,241,.14)">Aa 14</span></td><td class="num ${ok ? 'g-pass' : 'g-fail'}">${r.toFixed(2)}:1 ${ok ? 'AA' : 'fail'}</td><td>${use}</td></tr>`;
}).join('');

const samples = {
  display: '<span class="mm-dim">You have the idea.</span> Build it in seconds.',
  h2: '<span class="mm-dim">One price.</span> No surprises.',
  h3: 'A website is one page of your launch.',
  h4: 'Five days, one kit.',
  stat: '$500',
  lead: 'No tiers to compare and no “contact us”. Everything in the kit comes with the setup.',
  'body-lg': 'Is it really designed by people?',
  body: 'A designer draws your logo, sets your brand and designs your page in Figma.',
  small: 'Starts the month after launch.',
  label: 'Every AI founder starts here.',
  micro: 'Flight time · 5 business days',
  wordmark: 'muzmesh',
};
const typeRows = Object.entries(type).map(([k, [s, w, lh, ls, fam, d]]) => {
  const style = `font-family:var(--mm-font-${fam});font-size:${s};font-weight:${w};line-height:${lh};letter-spacing:${ls};${['label', 'micro'].includes(k) ? 'text-transform:uppercase;' : ''}${['lead', 'small'].includes(k) ? 'color:var(--mm-text-muted);' : ''}`;
  return `<div><div class="k"><b>${k}</b><span>${esc(s)}</span><span>${w} · ${lh} · ${ls}</span></div><div class="v" style="${style}">${k === 'label' ? `<span class="mm-label" style="font-size:inherit">${samples[k]}</span>` : samples[k]}</div></div>`;
}).join('');
const spaceRows = Object.entries(space).map(([k, v]) => `<div><span>space-${k}</span><span>${v}</span><i style="width:${v}"></i></div>`).join('');
const radiusRows = Object.entries(radius).map(([k, [v, d]]) => `<figure><div style="border-radius:${v === '999px' ? '999px' : v}"></div><figcaption>${k} · ${v}<br>${esc(d)}</figcaption></figure>`).join('');
const layoutRows = Object.entries(layout).map(([k, [v, d]]) => `<tr><td><code>--mm-${k}</code></td><td class="num">${esc(v)}</td><td>${esc(d)}</td></tr>`).join('');
const motionRows = Object.entries(motion).map(([k, [v, d]]) => `<tr><td><code>--mm-${k}</code></td><td class="num">${esc(v)}</td><td>${esc(d)}</td></tr>`).join('')
  + '<tr><td>Scroll story</td><td class="num">0.3px per ms</td><td>The homepage story is one paused timeline; scroll position is time, smoothed by about 75ms.</td></tr>'
  + '<tr><td>Pulse ring</td><td class="num">2.2s, 1s delay</td><td>The Launch button only, while it waits to be pressed.</td></tr>';

const dataUri = (p) => 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(resolve(here, p))).toString('base64');
let page = readFileSync(resolve(here, 'guideline.src.html'), 'utf8');
const fills = {
  TOKENS: css, BRAND: readFileSync(resolve(root, 'web/src/styles/brand.css'), 'utf8'),
  WORDMARK: dataUri('muzmesh-wordmark.svg'), WORDMARK_LIGHT: dataUri('muzmesh-wordmark-light.svg'),
  AVATAR: dataUri('muzmesh-avatar.svg'), FAVICON: dataUri('muzmesh-favicon.svg'),
  SWATCHES_LAUNCH: launchSw, SWATCHES_PAPER: paperSw, CONTRAST_ROWS: contrastRows, TYPE_ROWS: typeRows,
  SPACE_ROWS: spaceRows, RADIUS_ROWS: radiusRows, LAYOUT_ROWS: layoutRows, MOTION_ROWS: motionRows,
};
page = page.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => { if (!(k in fills)) throw new Error('unknown placeholder ' + k); return fills[k]; });
// repo copy is a full document; the published artifact gets its skeleton from the host
const [headPart, bodyPart] = page.split('</style>');
out('docs/brand/brand-guidelines.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${headPart}</style>\n</head>\n<body>${bodyPart}</body>\n</html>\n`);
if (process.env.ARTIFACT_OUT) writeFileSync(process.env.ARTIFACT_OUT, page);
console.log('\ncontrast check:');
for (const [name, fg, bg, t] of pairs) { const r = ratio(themes[t][fg] ?? fg, themes[t][bg] ?? bg); console.log(`  ${r >= 4.5 ? 'ok  ' : 'FAIL'} ${r.toFixed(2)}  ${name}`); }
