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
  display: ['clamp(40px, 4.6vw, 72px)', 500, 1.02, '-0.035em', 'sans', 'One per page. Hero headline.'],
  h2:      ['clamp(34px, 3.7vw, 56px)', 500, 1.04, '-0.03em',  'sans', 'Section headline. Two-tone allowed: dim the first part with .mm-dim.'],
  h3:      ['clamp(26px, 2.6vw, 40px)', 500, 1.08, '-0.025em', 'sans', 'Sub-section headline, closing lines, big quotes.'],
  h4:      ['22px', 600, 1.2, '-0.015em', 'sans', 'Card and panel titles.'],
  stat:    ['clamp(44px, 4.6vw, 64px)', 500, 1, '-0.04em', 'sans', 'Big numbers: $500, 5 days, 40%. Always tabular figures.'],
  lead:    ['clamp(17px, 1.35vw, 20px)', 400, 1.5, '-0.01em', 'sans', 'Paragraph under a headline. Max 40ch. Colour --mm-text-muted.'],
  'body-lg': ['17px', 400, 1.5, '-0.01em', 'sans', 'Long reading, FAQ questions and answers, form fields.'],
  body:    ['15px', 400, 1.55, '0', 'sans', 'Default text.'],
  button:  ['16px', 600, 1, '-0.01em', 'sans', 'Button labels. Small buttons are 14px, same weight.'],
  ui:      ['14px', 400, 1.45, '0', 'sans', 'Nav links, chips, table cells, list items in panels.'],
  small:   ['13px', 400, 1.45, '0', 'sans', 'Captions, helper text, footnotes. Never smaller for sans text.'],
  label:   ['11.5px', 400, 1.2, '0.06em', 'mono', 'UPPERCASE eyebrow with the orange square bullet.'],
  micro:   ['10.5px', 500, 1.2, '0.12em', 'mono', 'UPPERCASE ticket fields, table heads, tags.'],
  data:    ['12px', 400, 1.5, '0', 'mono', 'Timestamps, URLs, build logs, code. Mixed case, never tracked.'],
  wordmark:['22px', 700, 1, '-0.015em', 'sans', 'Text wordmark in the nav. Lowercase. The only 700 in the system.'],
};
// tracking follows size: the bigger the type, the tighter. Mono is never tracked negative; lowercase is never tracked positive.
const tracking = [
  // [size range, tracking, used by, sample size, sample text]
  ['96px and up', '-0.045em', 'posters, the giant footer wordmark', '96px', 'Launch'],
  ['64–95px', '-0.035em', 'display', '64px', 'Launch in 5 days'],
  ['48–63px', '-0.03em', 'h2', '48px', 'Launch in 5 days'],
  ['32–47px', '-0.025em', 'h3, closing lines', '32px', 'Launch in 5 days, not 5 weeks'],
  ['24–31px', '-0.02em', 'headlines on phones', '24px', 'Launch in 5 days, not 5 weeks'],
  ['18–23px', '-0.015em', 'h4, wordmark, quotes in cards', '22px', 'Launch in 5 days, not 5 weeks'],
  ['16–17px', '-0.01em', 'body-lg, lead, buttons', '17px', 'Launch in 5 days, not 5 weeks. One price, no surprises.'],
  ['15px and below', '0', 'body, ui, small', '15px', 'Launch in 5 days, not 5 weeks. One price, no surprises.'],
  ['Mono UPPERCASE 11.5px', '+0.06em', 'label', '11.5px', 'Ready in 15 seconds', 'mono-up'],
  ['Mono UPPERCASE 10.5px', '+0.12em', 'micro', '10.5px', 'Launch pass · Gate 04', 'mono-up'],
  ['Mono mixed case', '0', 'data', '12px', '2026-11-11 09:41 · muzmesh.com/launch', 'mono'],
];
const features = {
  text: ['"kern" 1, "liga" 1, "calt" 1', 'Every text: kerning, ligatures and contextual alternates on. Set once on .mm.'],
  num: ['"tnum" 1, "lnum" 1', 'Prices, stats, countdowns, tables, timestamps: tabular lining figures so digits line up and do not jump.'],
  caps: ['"case" 1, "cpsp" 1', 'Rare all-caps sans (avoid): case-sensitive punctuation and capital spacing.'],
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


// ---------- 4. Icons: 16px grid, 2px safe area, 1.6 stroke, round caps and joins, no fills ----------
// Each icon is a list of SVG elements drawn in currentColor. Keep new icons to this grid and stroke.
const icons = {
  'arrow-right': ['<path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5"/>', 'Every forward action: "Plan my launch".'],
  'arrow-up-right': ['<path d="M4.5 11.5l7-7M5.5 4.5h6v6"/>', 'Links that leave the page.'],
  'arrow-down': ['<path d="M8 3v9.5M3.5 8.5 8 13l4.5-4.5"/>', 'Scroll cue, jump to section.'],
  'chevron-down': ['<path d="M4 6l4 4 4-4"/>', 'Accordions, selects.'],
  check: ['<path d="M3 8.5l3.2 3L13 4.5"/>', 'What is included, done steps.'],
  plus: ['<path d="M8 3v10M3 8h10"/>', 'Open, add.'],
  minus: ['<path d="M3 8h10"/>', 'Close an open row.'],
  close: ['<path d="M4 4l8 8M12 4l-8 8"/>', 'Dismiss.'],
  menu: ['<path d="M2.5 5.5h11M2.5 10.5h11"/>', 'Phone nav. Two lines, not three.'],
  search: ['<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/>', 'Search.'],
  mail: ['<rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><path d="M3 5l5 4 5-4"/>', 'Email.'],
  chat: ['<path d="M3 3.5h10v7H7.5L4.5 13v-2.5H3z"/>', 'Talk to us, comments.'],
  calendar: ['<rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/>', 'Book a call, day of the five.'],
  clock: ['<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.2l2.2 1.4"/>', 'Turnaround, local time.'],
  ticket: ['<path d="M2.5 4.5h11v2.2a1.3 1.3 0 0 0 0 2.6v2.2h-11V9.3a1.3 1.3 0 0 0 0-2.6z"/><path d="M9.5 5v1.2M9.5 7.4v1.2M9.5 9.8V11"/>', 'The launch pass, pricing.'],
  window: ['<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6h12"/>', 'Landing page, website.'],
  layers: ['<path d="M8 2.5l5.5 3-5.5 3-5.5-3z"/><path d="M2.5 8.5l5.5 3 5.5-3M2.5 11l5.5 3 5.5-3"/>', 'The kit, brand system.'],
  pen: ['<path d="M10.2 3.3l2.5 2.5-6.9 6.9-3.1.6.6-3.1z"/><path d="M8.7 4.8l2.5 2.5"/>', 'Logo, design, edit.'],
  video: ['<rect x="2" y="4" width="9" height="8" rx="1.5"/><path d="M11 7l3-1.8v5.6L11 9"/>', 'Product intro video.'],
  play: ['<path d="M5.5 3.5v9l7-4.5z"/>', 'Play a video.'],
  chart: ['<path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5"/>', 'Analytics and tracking.'],
  users: ['<circle cx="6" cy="6" r="2.2"/><path d="M2.5 12.5c.5-2 1.9-3 3.5-3s3 1 3.5 3"/><circle cx="11" cy="5.5" r="1.8"/><path d="M10.6 9.3c1.5 0 2.5.9 2.9 2.7"/>', 'CRM, waitlist, referral.'],
  globe: ['<circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c1.6 1.6 2.3 3.5 2.3 5.5S9.6 11.9 8 13.5M8 2.5C6.4 4.1 5.7 6 5.7 8s.7 3.9 2.3 5.5"/>', 'Domain, live site.'],
  lock: ['<rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"/>', 'You own it, private.'],
  link: ['<path d="M7 9a2.5 2.5 0 0 0 3.5 0l2-2A2.5 2.5 0 0 0 9 3.5l-.8.8M9 7a2.5 2.5 0 0 0-3.5 0l-2 2A2.5 2.5 0 0 0 7 12.5l.8-.8"/>', 'Referral link, copy link.'],
  download: ['<path d="M8 2.5V10M4.5 6.5 8 10l3.5-3.5M3 13h10"/>', 'Download files.'],
  pin: ['<path d="M8 14s-4.5-4-4.5-7.5a4.5 4.5 0 0 1 9 0C12.5 10 8 14 8 14z"/><circle cx="8" cy="6.5" r="1.5"/>', 'Location in the footer.'],
  info: ['<circle cx="8" cy="8" r="5.5"/><path d="M8 7.3V11M8 5h.01"/>', 'Notes, help.'],
};
const iconSvg = (name, size = 16, sw = 1.6) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name][0]}</svg>`;

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
${Object.entries(features).map(([k, [v]]) => `  --mm-features-${k}: ${v};`).join('\n')}

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


// icon files: one SVG per icon, plus an Astro component for the site
for (const name of Object.keys(icons)) out(`docs/brand/icons/${name}.svg`, iconSvg(name) + '\n');
out('web/src/components/Icon.astro', `---
// MuzMesh icons. Generated by docs/brand/build-tokens.mjs from its icon list: add icons there, not here.
// 16px grid, 1.6 stroke, round caps, currentColor. Usage: <Icon name="arrow-right" /> or <Icon name="check" size={20} />
const icons = ${JSON.stringify(Object.fromEntries(Object.entries(icons).map(([k, [v]]) => [k, v])), null, 2)} as const;
type Props = { name: keyof typeof icons; size?: number; label?: string; class?: string };
const { name, size = 16, label, class: className } = Astro.props;
---
<svg
  width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width={size >= 24 ? 1.4 : 1.6}
  stroke-linecap="round" stroke-linejoin="round" class={className}
  role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}
  set:html={icons[name]}
/>
`);

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
  button: 'Plan my launch',
  ui: 'How it works · Pricing · FAQ',
  small: 'Starts the month after launch.',
  data: 'muzmesh.com/launch · 09:42:07 · build 1.4.2',
  label: 'Every AI founder starts here.',
  micro: 'Flight time · 5 business days',
  wordmark: 'muzmesh',
};
const trackDemo = tracking.map(([range, ls, use, px, txt, fam]) => {
  const st = `font-size:${px};letter-spacing:${ls.replace('+', '')};${fam ? 'font-family:var(--mm-font-mono);' : 'font-weight:' + (parseFloat(px) >= 24 ? 500 : 400) + ';'}${fam === 'mono-up' ? 'text-transform:uppercase;font-weight:' + (px === '10.5px' ? 500 : 400) + ';' : ''}${fam === 'mono' ? 'color:var(--mm-text-muted);' : ''}`;
  return `<div><span class="k"><b>${ls}</b>${range}<em>${use}</em></span><span class="v" style="${st}">${txt}</span></div>`;
}).join('\n        ');
const featureRows = Object.entries(features).map(([k, [v, d]]) => `<tr><td><code>--mm-features-${k}</code></td><td class="num">${v.replace(/"/g, '&quot;')}</td><td>${d}</td></tr>`).join('\n            ');
const typeRows = Object.entries(type).map(([k, [s, w, lh, ls, fam, d]]) => {
  const style = `font-family:var(--mm-font-${fam});font-size:${s};font-weight:${w};line-height:${lh};letter-spacing:${ls};${['label', 'micro'].includes(k) ? 'text-transform:uppercase;' : ''}${['lead', 'small', 'ui', 'data'].includes(k) ? 'color:var(--mm-text-muted);' : ''}${['stat'].includes(k) ? 'font-feature-settings:var(--mm-features-num);' : ''}`;
  return `<div><div class="k"><b>${k}</b><span>${esc(s)}</span><span>${w} · ${lh} · ${ls}</span></div><div class="v" style="${style}">${k === 'label' ? `<span class="mm-label" style="font-size:inherit">${samples[k]}</span>` : samples[k]}</div></div>`;
}).join('');
const spaceRows = Object.entries(space).map(([k, v]) => `<div><span>space-${k}</span><span>${v}</span><i style="width:${v}"></i></div>`).join('');
const radiusRows = Object.entries(radius).map(([k, [v, d]]) => `<figure><div style="border-radius:${v === '999px' ? '999px' : v}"></div><figcaption>${k} · ${v}<br>${esc(d)}</figcaption></figure>`).join('');
const layoutRows = Object.entries(layout).map(([k, [v, d]]) => `<tr><td><code>--mm-${k}</code></td><td class="num">${esc(v)}</td><td>${esc(d)}</td></tr>`).join('');
const motionRows = Object.entries(motion).map(([k, [v, d]]) => `<tr><td><code>--mm-${k}</code></td><td class="num">${esc(v)}</td><td>${esc(d)}</td></tr>`).join('')
  + '<tr><td>Scroll story</td><td class="num">0.3px per ms</td><td>The homepage story is one paused timeline; scroll position is time, smoothed by about 75ms.</td></tr>'
  + '<tr><td>Pulse ring</td><td class="num">2.2s, 1s delay</td><td>The Launch button only, while it waits to be pressed.</td></tr>';


const iconGrid = Object.entries(icons).map(([k, [, d]]) => `<figure class="g-ico" title="${esc(d)}">${iconSvg(k, 24, 1.5)}<figcaption>${k}</figcaption></figure>`).join('');
const imgUri = (p) => 'data:image/jpeg;base64,' + Buffer.from(readFileSync(resolve(here, p))).toString('base64');

const dataUri = (p) => 'data:image/svg+xml;base64,' + Buffer.from(readFileSync(resolve(here, p))).toString('base64');
let page = readFileSync(resolve(here, 'guideline.src.html'), 'utf8');
// ---------- image prompt library: one style block + one subject per image type, for any image model ----------
const imagery = {
  style: 'Documentary photograph, honest and unstaged. Natural window light with a warm desk lamp, muted colour (about 70% saturation), soft contrast, shadows that fall to near-black, shallow depth of field, 35mm lens, fine film grain. Real, slightly lived-in workspace. Leave calm dark space on one side for a headline.',
  avoid: 'text, letters, logos, watermarks, readable screens or UI, robots, glowing brains, circuit boards, holograms, neon, purple or blue gradients, 3D renders, lens flare, posed stock smiles, handshakes, extra fingers',
  after: [
    'For black layouts, convert to the duotone grade: black #0A0A0C to bone #F4F4F1 (Photoshop Gradient Map, Figma “Luminosity” blend over a black fill, or any duotone tool).',
    'For case studies and the founder’s own photos, keep the natural grade: saturation down to about 72%, no filters.',
    'Check hands, faces and edges at 100%. Reject anything with warped fingers, fake lettering or plastic skin.',
    'Crop so the subject sits on one third and the dark space holds the headline. Text over a photo always sits on the dark gradient.',
  ],
  rules: [
    'Generated images are for mood, backgrounds, textures and editorial scenes.',
    'Never present a generated person as a real client, founder, team member or testimonial, and never use generated images in case studies. Those use real photos and real screenshots.',
    'Never generate our logo, a client’s logo or UI. Add type and screens afterwards in the layout.',
  ],
  prompts: [
    { id: 'founder', title: 'Founder at work', ar: '4:5', use: 'Hero and social posts about the founder’s problem', img: 'IMG_PEOPLE_MONO', subject: 'A startup founder in their late twenties working late at a wooden desk, face lit softly by a laptop and a small desk lamp, looking at the screen rather than the camera, notebook and coffee beside the laptop, quiet evening room' },
    { id: 'hands', title: 'Hands sketching', ar: '3:2', use: 'Process posts, “designed by people” sections', img: 'IMG_HANDS_MONO', subject: 'Close-up of a designer’s hands sketching logo ideas in pencil in a paper notebook, eraser crumbs on the page, a mug at the edge of the frame, shot from slightly above' },
    { id: 'desk', title: 'Desk detail', ar: '1:1', use: 'Backgrounds for quotes, carousel covers, blog headers', img: 'IMG_DESK_MONO', subject: 'Top-down view of a dark wooden desk with an open notebook of website wireframe sketches, a pencil, a phone lying face down and a printed colour card with one small orange square, generous empty space around the objects' },
    { id: 'review', title: 'Design review', ar: '16:9', use: 'About page, case-study openers (as mood, not proof)', subject: 'Two people seen from behind reviewing printed pages of a website design pinned to a dark studio wall, one pointing at a detail, warm evening light from a side window' },
    { id: 'launch', title: 'Launch moment', ar: '4:5', use: 'Launch announcements, “now live” posts', subject: 'A hand holding a phone at night, the screen glowing a soft blank warm white with nothing readable on it, blurred city lights far behind, the phone held low as if just about to share something' },
    { id: 'studio', title: 'Quiet studio corner', ar: '9:16', use: 'Story and reel backgrounds with text on top', subject: 'An empty corner of a small design studio at dusk, one chair, a desk lamp switched on, a pinboard with paper sketches, most of the frame in deep shadow' },
    { id: 'paper', title: 'Paper prototypes', ar: '4:5', use: 'Carousel slides about process, “how we work”', subject: 'Printed paper screens of a landing page laid out in a row on a dark table, a hand moving one of them, pencil marks and arrows on the paper, shot at a low angle' },
    { id: 'window', title: 'Late-night window', ar: '16:9', use: 'Blog headers, newsletter covers, website section breaks', subject: 'A desk by a large window at night, a laptop closed, a notebook open with a few handwritten lines, city lights softly out of focus outside, the room almost dark' },
    { id: 'curtain', title: 'Copper light texture', ar: '16:9', use: 'Campaign covers, hero backgrounds, banners (no people)', subject: 'Abstract soft vertical streaks of warm copper light rising from the bottom of a pure black frame, like evening light through tall blinds, heavily blurred, no objects, minimal', style: 'Minimal abstract photograph, pure black background, warm copper and amber light only, soft blur, fine film grain.' },
  ],
};
const mjAvoid = imagery.avoid.replace(/, extra fingers/, '');
const promptFor = (q) => `${q.subject}. ${q.style || imagery.style} Aspect ratio ${q.ar}. Avoid: ${imagery.avoid}.`;
const promptMj = (q) => `${q.subject}, ${(q.style || imagery.style).replace(/\.\s*/g, ', ').replace(/,\s*$/, '')} --ar ${q.ar} --style raw --stylize 50 --no ${mjAvoid}`;

// ---------- AI brand pack (docs/brand/ai/): the same rules as plain text, for ChatGPT, DeepSeek, Claude, Gemini, Cursor … ----------
const VERSION = 'v2 · Nov 2026';
const BRAND_NAME = 'MuzMesh';
const mdRow = (...c) => `| ${c.join(' | ')} |`;
const roleDesc = (v) => (core[v] ? `${core[v][0]} (${v})` : v);
const roleKeys = Object.keys(themes.launch).filter((k) => k !== '_desc');
const aiFills = {
  BRAND_NAME, VERSION,
  CORE_TABLE: Object.entries(core).map(([k, [v, d]]) => mdRow(k, `\`${v}\``, d)).join('\n'),
  ROLE_TABLE: roleKeys.map((k) => mdRow(`\`--mm-${k}\``, roleDesc(themes.launch[k]), roleDesc(themes.paper[k]))).join('\n'),
  CONTRAST_TABLE: pairs.map(([name, fg, bg, t]) => { const r = ratio(themes[t][fg] ?? fg, themes[t][bg] ?? bg); return mdRow(name, r.toFixed(2) + ':1', r >= 4.5 ? 'pass (AA)' : 'FAIL: never use'); }).join('\n'),
  TRACK_TABLE: tracking.map(([r, ls, u]) => mdRow(r, ls, u)).join('\n'),
  FEATURE_TABLE: Object.entries(features).map(([k, [v, d]]) => mdRow('`--mm-features-' + k + '`', '`' + v + '`', d)).join('\n'),
  TYPE_TABLE: Object.entries(type).map(([k, [sz, w, lh, ls, fam, d]]) => mdRow(k, sz, w, lh, ls, fam === 'mono' ? 'JetBrains Mono' : 'Inter Tight', d)).join('\n'),
  LAYOUT_TABLE: Object.entries(layout).map(([k, [v, d]]) => mdRow(`\`--mm-${k}\``, v, d)).join('\n'),
  SPACE_LIST: Object.values(space).join(', '),
  RADIUS_LIST: Object.entries(radius).map(([k, [v, d]]) => `${k} ${v} (${d.toLowerCase()})`).join('; '),
  ICON_COUNT: String(Object.keys(icons).length), ICON_LIST: Object.keys(icons).join(', '),
  TOKENS_CSS: css.trim(),
  IMAGE_STYLE: imagery.style, IMAGE_AVOID: imagery.avoid,
  IMAGE_PROMPTS_MD: imagery.prompts.map((q) => `**${q.title}** (${q.ar}, ${q.use})\n\n\`\`\`\n${promptFor(q)}\n\`\`\``).join('\n\n'),
  IMAGE_AFTER_MD: imagery.after.map((t) => '- ' + t).join('\n'), IMAGE_RULES_MD: imagery.rules.map((t) => '- ' + t).join('\n'),
};
const brandMd = readFileSync(resolve(here, 'ai/brand.src.md'), 'utf8')
  .replace(/<!--[\s\S]*?-->\n\n/, '<!-- Generated by docs/brand/build-tokens.mjs from ai/brand.src.md. Do not edit by hand. -->\n\n')
  .replace(/<dim>(.*?)<\/dim>/g, '$1')
  .replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => { if (!(k in aiFills)) throw new Error('unknown AI placeholder ' + k); return aiFills[k]; });
const lc = (r) => resolveColor(r).toUpperCase();
const systemPrompt = `You design and write for ${BRAND_NAME}. Follow the attached BRAND.md exactly; it wins over any other style.
Essentials: black page ${lc('black')}; text bone ${lc('bone')} (never pure white); one accent, orange ${lc('signal')}, only for the single primary button per view, the 5px square before labels, live dots and focus rings, always with dark text ${lc('on-accent')} on it. Paper theme for documents: ${lc('paper')} page, ink ${lc('ink')} text, orange text ${lc('signal-ink')}.
Inter Tight for all text (400-700); JetBrains Mono only for UPPERCASE labels and data. Two-tone headlines: dim setup, bright payoff. Every section opens with a mono label.
Show real work in browser frames. No emoji, sparkles, robots, glowing brains, gradients on text or AI-generated people.
Copy: short, plain, founder to founder. Exact true numbers. Never: unlock, seamless, revolutionary, AI-powered, game-changer.
Use only colours and fonts in BRAND.md. Before answering, run its section 13 checklist.`;
if (systemPrompt.length > 1500) throw new Error('system prompt too long for ChatGPT custom instructions: ' + systemPrompt.length);
const allow = {
  hex: [...new Set([...Object.values(core).map(([v]) => v.toUpperCase()), '#FFFFFF', '#0A0A0C', '#1B1B20', '#7F7F7F', '#595857', '#686764', '#8A8884'])],
  fonts: ['Inter Tight', 'Inter', 'JetBrains Mono', 'system-ui', 'sans-serif', 'monospace', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'inherit'],
  // type scale: fixed sizes under 24px must be one of these; bigger sizes are headlines and come from the clamp() tokens
  fontSizesPx: [10.5, 11.5, 12, 13, 14, 15, 16, 17, 22],
  letterSpacingEm: [-0.045, -0.04, -0.035, -0.03, -0.025, -0.02, -0.015, -0.01, 0, 0.06, 0.12],
  fontWeights: [400, 500, 600, 700],
  bannedWords: ['revolutionary', 'unlock', 'seamless', 'supercharge', 'cutting-edge', 'ai-powered', 'game-changer', 'elevate', 'leverage', 'world-class', 'pixel-perfect', 'get started', 'learn more', 'click here'],
};
out('docs/brand/ai/BRAND.md', brandMd);
out('docs/brand/ai/system-prompt.txt', systemPrompt + '\n');
out('docs/brand/ai/brand-allowlist.json', JSON.stringify(allow, null, 2) + '\n');
out('docs/brand/ai/tokens.css', css);
out('docs/brand/ai/brand.css', readFileSync(resolve(root, 'web/src/styles/brand.css'), 'utf8'));
for (const f of ['muzmesh-wordmark.svg', 'muzmesh-wordmark-light.svg', 'muzmesh-avatar.svg']) out('docs/brand/ai/' + f, readFileSync(resolve(here, f), 'utf8'));
const starter = readFileSync(resolve(here, 'ai/starter.src.html'), 'utf8')
  .replace('{{TOKENS}}', css).replace('{{BRAND}}', readFileSync(resolve(root, 'web/src/styles/brand.css'), 'utf8'))
  .replace(/\{\{ICON:([a-z-]+)\}\}/g, (m, k) => iconSvg(k))
  .replace('{{WORDMARK_SVG}}', readFileSync(resolve(here, 'muzmesh-wordmark-light.svg'), 'utf8').replace(/<\?xml[^>]*>/, '').replace('<svg', '<svg role="img" aria-label="muzmesh" height="22"'));
out('docs/brand/ai/starter.html', starter);

const promptLib = (() => {
  const card = (q) => `<article class="g-pl-card">${q.img ? `<img src="{{${q.img}}}" alt="">` : `<div class="g-pl-ph${q.id === 'curtain' ? ' cu' : ''}" aria-hidden="true"></div>`}<div class="b"><div class="t"><b>${esc(q.title)}</b><span class="mm-micro">${q.ar}</span></div><p class="u">${esc(q.use)}</p><pre id="pl-${q.id}">${esc(promptFor(q))}</pre><pre hidden id="pl-${q.id}-mj">${esc(promptMj(q))}</pre><div class="a"><button class="mm-btn is-ghost is-sm" type="button" data-copy="pl-${q.id}">Copy prompt</button><button class="mm-btn is-ghost is-sm" type="button" data-copy="pl-${q.id}-mj">Midjourney</button></div></div></article>`;
  return `<div class="g-pl-base">
  <div class="g-prompt"><div class="bar"><span class="mm-label">Brand style · add to every prompt</span><div><button class="mm-btn is-ghost is-sm" type="button" data-copy="pl-style">Copy</button></div></div><pre id="pl-style">${esc(imagery.style)}</pre></div>
  <div class="g-prompt"><div class="bar"><span class="mm-label">Always avoid</span><div><button class="mm-btn is-ghost is-sm" type="button" data-copy="pl-avoid">Copy</button></div></div><pre id="pl-avoid">${esc(imagery.avoid)}</pre></div>
</div>
<div class="g-pl">${imagery.prompts.map(card).join('')}</div>
<div class="g-pl-write g-card"><span class="mm-label is-quiet">Write your own</span><p><b>[Subject: who or what, doing what, where]</b> + the brand style + <b>Aspect ratio [4:5 · 1:1 · 16:9 · 9:16]</b> + “Avoid: …”. Describe a real scene a photographer could shoot. Name the light, not the mood: “desk lamp and window light”, not “inspiring”.</p></div>
<div class="g-table-wrap"><table class="g-table"><thead><tr><th>Tool</th><th>How</th></tr></thead><tbody>
  <tr><td>ChatGPT, Gemini, Copilot</td><td>Paste the full prompt as it is. They read the aspect ratio and the avoid list from the sentence.</td></tr>
  <tr><td>Midjourney</td><td>Use the Midjourney button: it adds <code>--ar</code>, <code>--style raw --stylize 50</code> and the <code>--no</code> list. Use a reference image from this page with <code>--sref</code> to lock the look.</td></tr>
  <tr><td>Adobe Firefly, Ideogram, Flux</td><td>Paste the prompt; set content type to Photo, visual intensity low, effects and styles off. Put the avoid list in the negative prompt field if there is one.</td></tr>
  <tr><td>Any tool</td><td>Generate four, keep one. Upscale before grading. Never ask for words inside the image.</td></tr>
</tbody></table></div>
<div class="g-dd">
  <div class="g-do"><h4>After you generate</h4><ul>${imagery.after.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
  <div class="g-dont"><h4>Where generated images can’t go</h4><ul>${imagery.rules.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
</div>`;
})();
const fills = {
  TOKENS: css, BRAND: readFileSync(resolve(root, 'web/src/styles/brand.css'), 'utf8'),
  WORDMARK: dataUri('muzmesh-wordmark.svg'), WORDMARK_LIGHT: dataUri('muzmesh-wordmark-light.svg'),
  AVATAR: dataUri('muzmesh-avatar.svg'), FAVICON: dataUri('muzmesh-favicon.svg'),
  SWATCHES_LAUNCH: launchSw, SWATCHES_PAPER: paperSw, CONTRAST_ROWS: contrastRows, TYPE_ROWS: typeRows, TRACK_DEMO: trackDemo, FEATURE_ROWS: featureRows,
  SPACE_ROWS: spaceRows, ICON_GRID: iconGrid,
  ICON: Object.fromEntries(Object.keys(icons).map((k) => [k, iconSvg(k)])),
  IMG_PEOPLE: imgUri('imagery/people-desk.jpg'), IMG_PEOPLE_MONO: imgUri('imagery/people-desk-mono.jpg'),
  IMG_HANDS: imgUri('imagery/hands-writing.jpg'), IMG_HANDS_MONO: imgUri('imagery/hands-writing-mono.jpg'),
  PROMPT_LIB: promptLib, AI_PROMPT: esc(systemPrompt), AI_BRAND_MD: brandMd.replace(/<\/script/gi, '<\\/script'),
  IMG_DESK: imgUri('imagery/desk-detail.jpg'), IMG_DESK_MONO: imgUri('imagery/desk-detail-mono.jpg'), RADIUS_ROWS: radiusRows, LAYOUT_ROWS: layoutRows, MOTION_ROWS: motionRows,
};
page = page.replace(/\{\{ICON:([a-z-]+)\}\}/g, (m, k) => { if (!icons[k]) throw new Error('unknown icon ' + k); return iconSvg(k); });
page = page.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => { if (!(k in fills) || typeof fills[k] !== 'string') throw new Error('unknown placeholder ' + k); return fills[k]; });
page = page.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => { if (!(k in fills) || typeof fills[k] !== 'string') throw new Error('unknown placeholder ' + k); return fills[k]; });
// repo copy is a full document; the published artifact gets its skeleton from the host
const [headPart, bodyPart] = page.split('</style>');
out('docs/brand/brand-guidelines.html', `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${headPart}</style>\n</head>\n<body>${bodyPart}</body>\n</html>\n`);
if (process.env.ARTIFACT_OUT) writeFileSync(process.env.ARTIFACT_OUT, page);
console.log('\ncontrast check:');
for (const [name, fg, bg, t] of pairs) { const r = ratio(themes[t][fg] ?? fg, themes[t][bg] ?? bg); console.log(`  ${r >= 4.5 ? 'ok  ' : 'FAIL'} ${r.toFixed(2)}  ${name}`); }
