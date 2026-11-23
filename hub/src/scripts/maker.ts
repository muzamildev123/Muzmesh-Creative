// The image maker: the post image templates on their own, saved to the library or downloaded.
import type { BrandRenderData } from '../lib/brand';
import type { PostImage } from '../lib/types';
import { drawPostImage, fontsFor, SIZES, type SizeKey } from './render-image';

interface Data { brand: BrandRenderData | null; slug: string; saveUrl: string }
const dataEl = document.getElementById('maker-data');
const form = document.querySelector<HTMLFormElement>('[data-maker-form]');

if (dataEl && form) {
  const data = JSON.parse(dataEl.textContent ?? '{}') as Data;
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-image]');
  const empty = document.querySelector<HTMLElement>('[data-empty]');
  const status = form.querySelector<HTMLElement>('[data-maker-status]');
  const val = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
  const size = (): SizeKey => { const s = val('size'); return s in SIZES ? (s as SizeKey) : 'square'; };
  const image = (): PostImage | null => {
    const headline = val('image_headline');
    return headline ? { template: val('image_template'), theme: val('image_theme') === 'dark' ? 'dark' : 'light', kicker: val('image_kicker'), headline, sub: val('image_sub') } : null;
  };
  let fonts: Promise<unknown> | null = null;
  const draw = async () => {
    if (!canvas || !data.brand) return;
    const img = image();
    canvas.hidden = !img;
    if (empty) empty.hidden = !!img;
    if (!img) return;
    fonts ??= Promise.all(fontsFor(data.brand).map((f) => document.fonts.load(f))).catch(() => undefined);
    await fonts;
    drawPostImage(canvas, data.brand, img, size());
  };
  const blob = () => new Promise<Blob | null>((res) => (canvas ? canvas.toBlob(res, 'image/png') : res(null)));
  const fileName = () => `${data.slug}-${(val('image_headline').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'image')}-${size()}.png`;

  form.addEventListener('input', () => void draw());
  form.addEventListener('change', () => void draw());
  form.querySelector('[data-download]')?.addEventListener('click', async () => {
    if (!image()) { if (status) status.textContent = 'Add a headline first.'; return; }
    await draw();
    const b = await blob();
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = fileName(); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const img = image();
    if (!img) { if (status) status.textContent = 'Add a headline first.'; return; }
    await draw();
    const b = await blob();
    if (!b) return;
    const fd = new FormData();
    fd.append('png', new File([b], fileName(), { type: 'image/png' }));
    fd.append('alt', [img.kicker, img.headline, img.sub].filter(Boolean).join('. '));
    fd.append('tags', val('tags'));
    if (status) status.textContent = 'Saving…';
    try {
      const r = await fetch(data.saveUrl, { method: 'POST', body: fd, credentials: 'same-origin' });
      const out = (await r.json()) as { url?: string; error?: string };
      if (status) {
        status.textContent = r.ok ? 'Saved to the library. ' : (out.error ?? 'Could not save.');
        if (r.ok && out.url) { const a = document.createElement('a'); a.href = out.url; a.className = 'mm-link'; a.textContent = 'Open the library'; status.insertAdjacentElement('beforeend', a); }
      }
    } catch { if (status) status.textContent = 'Could not save. Check your connection and try again.'; }
  });
  void draw();
}
