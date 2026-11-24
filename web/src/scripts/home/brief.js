/* ---------- Final CTA: the launch brief ---------- */
(() => {
  const sec = document.getElementById('launch-brief'); if (!sec) return;
  const f = id => document.getElementById(id);
  const form = f('lc-form'), send = f('lc-send'), need = f('lc-need');
  const name = f('lc-name'), startup = f('lc-startup'), what = f('lc-what'), email = f('lc-email');
  const fields = [...sec.querySelectorAll('.lc-f')];
  const chips = [...sec.querySelectorAll('.lc-chip')], all = chips.find(c => c.hasAttribute('data-all'));
  const touched = new Set();
  // browsers without field-sizing: size each blank to its text
  const fit = !CSS.supports('field-sizing', 'content');
  const size = el => { if (fit && el.tagName === 'INPUT') el.style.width = Math.max(4, (el.value || el.placeholder).length * .58 + 1) + 'em'; };
  const okMail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const missing = () => [[name, 'your name'], [startup, 'your startup’s name'], [email, 'an email']].filter(([el]) => el === email ? !okMail(el.value.trim()) : !el.value.trim());
  const sync = () => {
    const nm = startup.value.trim() || 'your startup';
    sec.querySelectorAll('.lc-nm').forEach((el, i) => el.textContent = i === sec.querySelectorAll('.lc-nm').length - 1 && nm === 'your startup' ? 'Your startup' : nm);
    send.setAttribute('aria-disabled', missing().length ? 'true' : 'false');
    fields.forEach(size);
  };
  // pre-fill from the story: the idea they typed, and the name it was given (only until they edit those blanks)
  const prefill = () => {
    const idea = (f('idea') && f('idea').value.trim()) || '';
    const gen = (f('rname') && f('rname').textContent.trim()) || '';
    if (!touched.has(what) && idea) what.value = idea.replace(/^(an?|the)\s+/i, m => m.toLowerCase());
    if (!touched.has(startup) && gen && gen !== 'your startup') startup.value = gen;
    sync();
  };
  new IntersectionObserver(es => es.some(e => e.isIntersecting) && prefill(), { rootMargin: '400px 0px' }).observe(sec);
  fields.forEach(el => el.addEventListener('input', () => { touched.add(el); el.classList.remove('bad'); need.textContent = ''; sync(); }));
  chips.forEach(c => c.addEventListener('click', () => {
    const on = c.getAttribute('aria-pressed') !== 'true';
    if (c === all) chips.forEach(o => o.setAttribute('aria-pressed', o === all && on));
    else { c.setAttribute('aria-pressed', on); all.setAttribute('aria-pressed', 'false'); if (!chips.some(o => o.getAttribute('aria-pressed') === 'true')) all.setAttribute('aria-pressed', 'true'); }
  }));
  const started = Date.now();
  const done = () => {
    f('lc-first').textContent = name.value.trim().split(/\s+/)[0];
    sync(); sec.classList.add('sent'); f('lc-done').focus({ preventScroll: true });
    f('lc-done').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
  };
  let sending = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const m = missing();
    if (m.length) {
      m.forEach(([el]) => el.classList.add('bad'));
      need.textContent = 'Add ' + m.map(x => x[1]).join(', ').replace(/, ([^,]*)$/, ' and $1') + ' and we’re ready.';
      m[0][0].focus(); return;
    }
    const data = new FormData(form);
    // bots fill the hidden field and send instantly: pretend it worked
    if (data.get('company_url') || Date.now() - started < 3000) return done();
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      // local preview without a lead endpoint: show the thank-you, send nothing
      if ('dev' in form.dataset) { console.warn('PUBLIC_LEAD_ENDPOINT is not set; the brief was not sent.'); return done(); }
      need.textContent = 'We couldn’t send this. Email us at ' + form.dataset.email + ' and we’ll reply the same day.'; return;
    }
    sending = true; send.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'), email: data.get('email'), company: data.get('startup'),
          building: data.get('building'), timeline: data.get('launch'), website: data.get('site'),
          needs: chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.textContent.trim()),
          source: location.pathname + '#launch-brief',
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      done();
    } catch {
      need.textContent = 'That didn’t go through. Try again, or email us at ' + form.dataset.email + '.';
    } finally { sending = false; send.removeAttribute('aria-busy'); }
  });
  f('lc-edit').addEventListener('click', () => { sec.classList.remove('sent'); name.focus(); });
  // the hero's global key handler shouldn't treat typing here as scrolling
  sec.addEventListener('keydown', e => { if (e.key === ' ' || e.key.startsWith('Arrow')) e.stopPropagation(); });
  sync();
})();
