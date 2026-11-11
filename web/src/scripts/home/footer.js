/* ---------- Footer: their startup's name, and the time where we are ---------- */
(() => {
  const ft = document.getElementById('footer'); if (!ft) return;
  const t = document.getElementById('ft-time');
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: t.dataset.tz || 'Asia/Karachi' });
  const tick = () => { t.textContent = fmt.format(new Date()); };
  tick(); setInterval(tick, 30000);
  // the wordmark fills the width exactly, edge to edge inside the page margins
  const mark = ft.querySelector('.ft-mark');
  const fitMark = () => { mark.style.fontSize = '100px'; const w = mark.firstChild.getBoundingClientRect().width, room = mark.clientWidth; mark.style.fontSize = (100 * room / w * .995) + 'px'; };
  const ro = new ResizeObserver(fitMark); ro.observe(ft);
  document.fonts && document.fonts.ready.then(fitMark);
  // the sign-off uses the startup name from the launch brief if they typed one, otherwise the name the story gave them
  const nm = () => {
    const typed = document.getElementById('lc-startup'), gen = document.getElementById('rname');
    const v = (typed && typed.value.trim()) || (gen && gen.textContent.trim()) || 'your startup';
    ft.querySelectorAll('.ft-nm').forEach(el => el.textContent = v);
  };
  new IntersectionObserver(es => es.some(e => e.isIntersecting) && nm(), { rootMargin: '300px 0px' }).observe(ft);
})();
