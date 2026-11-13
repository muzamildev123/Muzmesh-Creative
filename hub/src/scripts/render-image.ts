// Draws a post image on a canvas from the client's brand kit and a few text fields.
// Nothing is generated: every layout is a fixed, hand-made template filled with the brand's own
// colours and fonts, so the result is always on brand.
import type { BrandRenderData } from '../lib/brand';
import type { PostImage } from '../lib/types';

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1200, h: 627, label: 'Wide 1200 x 627' },
} as const;
export type SizeKey = keyof typeof SIZES;

const withAlpha = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const wrap = (g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && g.measureText(test).width > maxWidth) { lines.push(line); line = word; }
      else line = test;
    }
    lines.push(line);
  }
  return lines;
};

interface Fit { size: number; lines: string[]; lineHeight: number }
/** The largest font size at which the text fits the box. */
const fit = (g: CanvasRenderingContext2D, text: string, font: (px: number) => string, box: { w: number; h: number }, max: number, min: number, lh: number): Fit => {
  for (let size = max; size >= min; size -= 2) {
    g.font = font(size);
    const lines = wrap(g, text, box.w);
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if (lines.length * size * lh <= box.h && widest <= box.w) return { size, lines, lineHeight: size * lh };
  }
  g.font = font(min);
  const lines = wrap(g, text, box.w);
  return { size: min, lines: lines.slice(0, Math.max(1, Math.floor(box.h / (min * lh)))), lineHeight: min * lh };
};

const drawLines = (g: CanvasRenderingContext2D, f: Fit, x: number, y: number): number => {
  f.lines.forEach((l, i) => g.fillText(l, x, y + i * f.lineHeight));
  return y + f.lines.length * f.lineHeight;
};

export const fontsFor = (b: BrandRenderData): string[] => [
  `${b.displayWeight} 64px "${b.display}"`, `400 32px "${b.body}"`, `${b.labelWeight} 24px "${b.label}"`,
];

export const drawPostImage = (canvas: HTMLCanvasElement, b: BrandRenderData, img: PostImage, sizeKey: SizeKey): void => {
  const { w, h } = SIZES[sizeKey];
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) return;
  const dark = img.theme === 'dark';
  const bg = dark ? b.dark : b.light;
  const ink = dark ? b.textOnDark : b.textOnLight;
  const muted = withAlpha(ink, 0.68);
  const pad = Math.round(w * 0.08);
  const unit = Math.min(w, h) / 1080;
  const display = (px: number) => `${b.displayWeight} ${px}px "${b.display}", Georgia, serif`;
  const body = (px: number, weight = 400) => `${weight} ${px}px "${b.body}", system-ui, sans-serif`;
  const label = (px: number) => `${b.labelWeight} ${px}px "${b.label}", system-ui, sans-serif`;

  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.textBaseline = 'top'; g.textAlign = 'left';

  // Top: the label with the brand's marker.
  const labelPx = Math.round(24 * unit);
  let top = pad;
  const kicker = (img.kicker || (img.template === 'changelog' ? 'New' : '')).toUpperCase();
  if (kicker) {
    let x = pad;
    g.fillStyle = b.accent;
    const m = Math.round(12 * unit);
    const my = top + (labelPx - m) / 2;
    if (b.labelMarker === 'dot') { g.beginPath(); g.arc(x + m / 2, my + m / 2, m / 2, 0, Math.PI * 2); g.fill(); x += m + 14 * unit; }
    else if (b.labelMarker === 'line') { g.fillRect(x, my + m / 2 - 1.5 * unit, 36 * unit, 3 * unit); x += 50 * unit; }
    else if (b.labelMarker === 'square') { g.fillRect(x, my, m, m); x += m + 14 * unit; }
    g.fillStyle = ink; g.font = label(labelPx);
    try { (g as unknown as { letterSpacing: string }).letterSpacing = `${Math.round(labelPx * 0.08)}px`; } catch { /* older browsers */ }
    g.fillText(kicker, x, top);
    try { (g as unknown as { letterSpacing: string }).letterSpacing = '0px'; } catch { /* older browsers */ }
    top += labelPx + 48 * unit;
  }

  // Bottom: wordmark left, site right.
  const footPx = Math.round(30 * unit);
  const footY = h - pad - footPx;
  g.fillStyle = ink;
  g.font = b.wordmarkFont === 'display' ? `${b.wordmarkWeight} ${footPx}px "${b.display}", Georgia, serif` : body(footPx, b.wordmarkWeight);
  g.fillText(b.wordmark, pad, footY);
  if (b.url) {
    g.font = body(Math.round(22 * unit)); g.fillStyle = muted; g.textAlign = 'right';
    g.fillText(b.url, w - pad, footY + 6 * unit); g.textAlign = 'left';
  }
  g.fillStyle = withAlpha(ink, 0.16);
  g.fillRect(pad, footY - 36 * unit, w - pad * 2, Math.max(1, Math.round(2 * unit)));

  // Middle: the template.
  const area = { x: pad, y: top, w: w - pad * 2, h: footY - 36 * unit - top - 40 * unit };
  const subPx = Math.round(34 * unit);
  const subBox = img.sub ? Math.min(area.h * 0.34, subPx * 1.4 * 4) : 0;
  const gap = img.sub ? 32 * unit : 0;

  if (img.template === 'stat') {
    g.fillStyle = b.accent;
    const big = fit(g, img.headline, display, { w: area.w, h: area.h - subBox - gap }, Math.round(300 * unit), Math.round(72 * unit), 1.0);
    g.font = display(big.size);
    const end = drawLines(g, big, area.x, area.y);
    if (img.sub) { const s = fit(g, img.sub, (px) => body(px), { w: area.w, h: subBox }, Math.round(44 * unit), Math.round(24 * unit), 1.35); g.font = body(s.size); g.fillStyle = ink; drawLines(g, s, area.x, end + gap); }
    return;
  }

  let y = area.y;
  let textX = area.x;
  let textW = area.w;
  if (img.template === 'quote') {
    // An accent rule down the left carries the quote, instead of a decorative quote mark.
    g.fillStyle = b.accent;
    g.fillRect(area.x, area.y, Math.round(8 * unit), area.h);
    textX += 44 * unit; textW -= 44 * unit;
  }
  if (img.template === 'changelog') {
    g.fillStyle = b.accent;
    g.fillRect(area.x, y, Math.round(96 * unit), Math.round(8 * unit));
    y += 44 * unit;
  }
  const headBox = { w: textW, h: area.y + area.h - y - subBox - gap };
  g.fillStyle = ink;
  const head = fit(g, img.template === 'quote' ? `“${img.headline}”` : img.headline, display, headBox, Math.round((img.template === 'quote' ? 76 : 104) * unit), Math.round(40 * unit), 1.1);
  g.font = display(head.size);
  const end = drawLines(g, head, textX, y);
  if (img.sub) {
    const s = fit(g, img.sub, (px) => body(px), { w: textW, h: subBox }, subPx, Math.round(22 * unit), 1.4);
    g.font = body(s.size); g.fillStyle = muted;
    drawLines(g, s, textX, end + gap);
  }
};
