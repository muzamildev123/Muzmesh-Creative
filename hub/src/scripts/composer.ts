// The post composer: live character count, live brand check, live preview and the image canvas.
// The check is the same function the server runs (src/lib/brand-check.ts); the server still has the last word.
import type { BrandRenderData } from '../lib/brand';
import { checkCopy, CHANNEL_LIMITS, countChars, type Channel, type CheckRules } from '../lib/brand-check';
import type { PostImage } from '../lib/types';
import { drawPostImage, fontsFor, SIZES, type SizeKey } from './render-image';

type Field = HTMLElement & { value: string };
interface Data { rules: CheckRules; brand: BrandRenderData | null; slug: string; saved: PostImage | null }
const dataEl = document.getElementById('composer-data');
const root = document.querySelector<HTMLElement>('[data-composer]');

if (dataEl && root) {
  const data = JSON.parse(dataEl.textContent ?? '{}') as Data;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const copy = $<Field>('[name=copy]');
  const channel = $<Field>('[name=channel]');
  const count = $('[data-count]');
  const issuesEl = $('[data-issues]');
  const previewCopy = $('[data-preview-copy]');
  const previewChannel = $('[data-preview-channel]');
  const canvas = $<HTMLCanvasElement>('canvas[data-image]');
  const imageWrap = $('[data-image-wrap]');
  const sizeSel = $<Field>('[data-size]');
  const download = $<HTMLButtonElement>('[data-download]');
  const field = (n: string) => root.querySelector<Field>(`[name="image_${n}"]`);

  const currentChannel = (): Channel => ((channel?.value ?? root.dataset.channel) === 'x' ? 'x' : 'linkedin');
  const currentCopy = (): string => copy?.value ?? root.dataset.copy ?? '';

  const currentImage = (): PostImage | null => {
    const template = field('template');
    if (!template) return data.saved;
    const headline = (field('headline')?.value ?? '').trim();
    if (!template.value || !headline) return null;
    return {
      template: template.value, theme: field('theme')?.value === 'dark' ? 'dark' : 'light',
      kicker: (field('kicker')?.value ?? '').trim(), headline, sub: (field('sub')?.value ?? '').trim(),
    };
  };

  const renderText = () => {
    const ch = currentChannel();
    const text = currentCopy();
    if (count) {
      const n = countChars(text.trim(), ch);
      count.textContent = `${n} / ${CHANNEL_LIMITS[ch]}`;
      count.classList.toggle('is-over', n > CHANNEL_LIMITS[ch]);
    }
    if (previewCopy) previewCopy.textContent = text.trim() || 'Your post appears here as you write.';
    if (previewChannel) previewChannel.textContent = ch === 'x' ? 'X' : 'LinkedIn';
    if (issuesEl && copy) {
      const issues = checkCopy(text, ch, data.rules);
      issuesEl.replaceChildren(...(issues.length ? issues : [{ level: 'pass', message: 'Passes the brand check.' }]).map((i) => {
        const li = document.createElement('li');
        li.className = `is-${i.level}`;
        li.textContent = i.message;
        return li;
      }));
    }
  };

  let fontsReady: Promise<unknown> | null = null;
  const renderImage = async () => {
    if (!canvas || !imageWrap) return;
    const img = currentImage();
    imageWrap.hidden = !img || !data.brand;
    if (!img || !data.brand) return;
    fontsReady ??= Promise.all(fontsFor(data.brand).map((f) => document.fonts.load(f))).catch(() => undefined);
    await fontsReady;
    const size = (sizeSel?.value ?? 'square') as SizeKey;
    drawPostImage(canvas, data.brand, img, size in SIZES ? size : 'square');
  };

  copy?.addEventListener('input', renderText);
  channel?.addEventListener('change', renderText);
  root.addEventListener('input', (e) => { if ((e.target as HTMLElement).getAttribute('name')?.startsWith('image_')) void renderImage(); });
  root.addEventListener('change', (e) => { if ((e.target as HTMLElement).getAttribute('name')?.startsWith('image_')) void renderImage(); });
  sizeSel?.addEventListener('change', () => void renderImage());
  download?.addEventListener('click', () => {
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${data.slug}-post-${sizeSel?.value ?? 'square'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  });

  renderText();
  void renderImage();
}
