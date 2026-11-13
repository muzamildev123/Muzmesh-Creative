// Small behaviours used on every page: copy buttons and "are you sure" on destructive forms.
// Loaded as a file so the Content-Security-Policy can forbid inline scripts.
document.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]');
  if (!btn) return;
  const sel = btn.dataset.copy!;
  const source = sel ? document.querySelector<HTMLElement>(sel) : null;
  const text = source ? (source instanceof HTMLTextAreaElement || source instanceof HTMLInputElement ? source.value : source.textContent ?? '') : btn.dataset.copyText ?? '';
  const label = btn.textContent;
  try {
    await navigator.clipboard.writeText(text.trim());
    btn.textContent = 'Copied';
  } catch {
    btn.textContent = 'Copy failed';
  }
  setTimeout(() => { btn.textContent = label; }, 1600);
});

document.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  const submitter = (e as SubmitEvent).submitter as HTMLElement | null;
  const msg = submitter?.dataset.confirm ?? form.dataset.confirm;
  if (msg && !window.confirm(msg)) e.preventDefault();
});
