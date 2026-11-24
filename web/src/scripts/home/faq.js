/* ---------- FAQ: one answer open at a time (on phones it can also be closed) ---------- */
(() => {
  const qs = [...document.querySelectorAll('.fq-q')];
  const small = matchMedia('(max-width:900px)');
  const open = (q, toggle) => {
    const was = q.getAttribute('aria-expanded') === 'true';
    if (was && !(toggle && small.matches)) return;
    for (const o of qs) {
      const on = o === q && !was;
      o.setAttribute('aria-expanded', on);
      document.getElementById(o.getAttribute('aria-controls')).classList.toggle('on', on);
    }
  };
  qs.forEach((q, i) => {
    q.addEventListener('click', () => open(q, true));
    q.addEventListener('keydown', e => {
      const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      const n = qs[(i + d + qs.length) % qs.length]; n.focus(); if (!small.matches) open(n);
    });
  });
})();
