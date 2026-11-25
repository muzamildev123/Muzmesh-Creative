(() => {
  const $ = id => document.getElementById(id);
  const hero = $('hero'), input = $('idea'), go = $('go'), chips = [...document.querySelectorAll('.chip')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sync = () => { go.disabled = !input.value.trim(); };

  /* ---------- light curtain ----------
     Each column is one fold of light. Its brightness comes from a sharpened sine (the pleats),
     its height from slow noise (some folds reach higher than others), and the whole field is brighter
     towards the bottom and the sides. Drawn at 150×56 and stretched, so it reads as soft, blurred streaks. */
  const cv = $('curtain'), cx = cv.getContext('2d'), W = cv.width, H = cv.height, img = cx.createImageData(W, H), d = img.data;
  const nz = a => .5 + .3 * Math.sin(a * 1.7) + .2 * Math.sin(a * 3.3 + 1.3);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let phone = innerWidth < 760;
  addEventListener('resize', () => { phone = innerWidth < 760; });
  const col = new Float32Array(W), top = new Float32Array(W);
  function draw(t) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const warp = Math.sin(x * .09 + t * .2) * 2.2 + Math.sin(x * .027 - t * .09) * 3.1;
      const p = .5 + .5 * Math.sin(x * .62 + warp + t * .3);
      const amp = .35 + .65 * nz(x * .17 + t * .06);   // some folds catch more light than others
      col[x] = Math.pow(p, 2.2) * amp * (phone ? .6 : .3 + .55 * sm(.12, .46, Math.abs(u - .5)));
      top[x] = .2 + .55 * nz(x * .045 + t * .07) + .2 * nz(x * .21 - t * .11);
    }
    for (let y = 0; y < H; y++) {
      const v = y / (H - 1);
      for (let x = 0; x < W; x++) {
        const reach = 1 - top[x];
        const k = Math.min(1, col[x] * (.06 + .94 * sm(reach - .18, reach + .5, v)));
        const i = (y * W + x) * 4;
        d[i] = 255 * Math.min(1, k * 1.15);
        d[i + 1] = 118 * Math.pow(k, 1.35);
        d[i + 2] = 34 * k * k;
        d[i + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
  }
  const t0 = performance.now();
  let raf = 0, last = 0;
  function loop(now) {
    if (hero.classList.contains('lost')) { raf = 0; return; }   // hidden behind the grid after launch: stop asking for frames
    raf = requestAnimationFrame(loop);
    if (now - last < 12) return;   // every frame (capped near 60fps), so the slow light never steps
    last = now;
    draw(4 + (now - t0) / 1000);
  }
  draw(4);
  if (!reduce) raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => {
    if (reduce) return;
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(loop);
  });


  /* ---------- placeholder slowly types example ideas while the bar is empty ---------- */
  const base = 'Describe your startup idea…';
  const examples = ['An AI that writes my investor updates', 'Duolingo, but for coding', 'An agent that answers support tickets', 'AI travel planner for families'];
  if (!reduce) setTimeout(() => {
    let i = 0, c = 0, dir = 1, hold = 0;
    setInterval(() => {
      if (document.activeElement === input || input.value) { if (input.placeholder !== base) input.placeholder = base; return; }
      if (hold > 0) { hold--; return; }
      const s = examples[i];
      c += dir;
      if (c > s.length) { dir = -1; hold = 40; c = s.length; }
      else if (c < 0) { dir = 1; c = 0; i = (i + 1) % examples.length; hold = 6; input.placeholder = base; return; }
      input.placeholder = c === 0 ? base : s.slice(0, c);
    }, 55);
  }, 2200);

  /* ---------- a chip types its idea into the bar ---------- */
  let typing = null;
  function typeIn(text) {
    clearInterval(typing);
    input.value = ''; sync();
    if (reduce) { input.value = text; sync(); go.focus(); prepSoon(); return; }
    let n = 0;
    typing = setInterval(() => {
      input.value = text.slice(0, ++n); sync();
      if (n >= text.length) { clearInterval(typing); go.focus({ preventScroll: true }); prepSoon(); }
    }, 24);
  }
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(o => o.setAttribute('aria-pressed', o === ch ? 'true' : 'false'));
    typeIn(ch.textContent.trim());
  }));
  input.addEventListener('input', () => {
    clearInterval(typing); sync();
    chips.forEach(o => o.setAttribute('aria-pressed', o.textContent.trim() === input.value.trim() ? 'true' : 'false'));
  });

  /* ---------- part two: the build ---------- */
  const PRODUCTS = {
    'AI note-taker for doctors': ['MediScribe AI', 'Supercharge your clinical notes with AI', 'The all-in-one AI scribe that saves doctors hours every day.'],
    'An agent that books my meetings': ['Bookly AI', 'Your AI-powered scheduling assistant', 'Let intelligent agents book, move and manage every meeting for you.'],
    'ChatGPT for lawyers': ['LexGPT', 'Revolutionize legal work with AI', 'The all-in-one AI platform that helps law firms work smarter, faster, and better.'],
    'AI copilot for sales teams': ['SalesPilot AI', 'Supercharge your sales team with AI', 'AI-powered insights that help every rep close more deals, faster.']
  };
  const STOP = new Set('a an the ai that for my me with and to of but app agent agents tool tools which who your i it in on is are like using via chatgpt gpt copilot build builds helps help'.split(' '));
  function productFor(idea) {
    if (PRODUCTS[idea]) return PRODUCTS[idea];
    const words = (idea.toLowerCase().match(/[a-z]+/g) || []).filter(w => w.length > 2 && !STOP.has(w));
    let w = words.sort((a, b) => b.length - a.length)[0] || 'neural';
    if (w.length > 5 && w.endsWith('s')) w = w.slice(0, -1);
    w = w.slice(0, 9);
    const h = [...idea].reduce((a, c) => a + c.charCodeAt(0), 0);
    const name = w[0].toUpperCase() + w.slice(1) + ['ly AI', 'ify', 'Flow AI', 'Pilot', 'GPT'][h % 5];
    return [name, 'Supercharge your workflow with AI-powered agents', 'The all-in-one AI platform that helps teams work smarter, faster, and better.', w[0].toUpperCase() + w.slice(1)];
  }

  const pg = $('pg'), vp = $('vp'), win = $('win'), steps = [...document.querySelectorAll('#steps li')];
  const slots = [...pg.querySelectorAll('.slot')];
  const fit = () => pg.style.setProperty('--s', (vp.clientWidth / 960).toFixed(4));
  new ResizeObserver(fit).observe(vp);

  /* ---------- part three: the launch ---------- */
  const CLONES = {
    'AI note-taker for doctors': ['clinical notes', 'ScribeMD,MedNote AI,DocScribe,ClinicGPT,NoteMD AI,ChartPilot,MediNote,ScribeFlow AI,DocuMed AI,CareScribe,MedScribe,NotesMD,ClinicNote AI,ScribeBot,MedFlow AI,DocNote AI'],
    'An agent that books my meetings': ['calendar', 'MeetFlow AI,Schedulr,BookBot AI,Slotify,AgendaGPT,MeetPilot,TimeWise AI,Bookify,CalPilot,MeetGPT,Slotly AI,AgentCal,Bookwise AI,Meetly,ScheduleGPT,TimeFlow AI'],
    'ChatGPT for lawyers': ['legal work', 'LegalGPT,CaseFlow AI,LawPilot,LexiAI,CounselGPT,BriefBot,Lawly AI,CaseGPT,LexFlow,Legalify,JurisGPT,BriefPilot,LawFlow AI,DocketGPT,Counselly,LexBot'],
    'AI copilot for sales teams': ['sales pipeline', 'DealPilot AI,CloseGPT,PipelineAI,SellFlow,RevPilot,QuotaAI,LeadGPT,Salesly AI,DealFlow AI,PitchGPT,CloseBot,RevFlow AI,Leadify,QuotaPilot,SalesGPT,DealBot'],
    '': ['workflow', 'Neuralify,Promptly AI,AgentFlow,Synthify,Cognify,Aigent,Hyperprompt,Vectorly,MindStack,Autopilotly,Lumen AI,Smartly,DeepThing,Orbit AI,Gradientic,Agentic OS']
  };
  const HEADS = ['Supercharge your {n} with AI', 'Your AI-powered {n} assistant', 'Revolutionize {n} with AI', '{N} on autopilot', 'The AI platform for {n}', '10x your {n} with AI agents', 'AI that handles your {n}', 'The future of {n} is here'];
  const lgridg = $('lgridg'), lgrid = $('lgrid'), lpan = $('lpan');
  let cur = null;
  const SUBS = ['The all-in-one AI platform that helps teams work smarter, faster, and better.', 'Save hours every week with intelligent automation.', 'Built with cutting-edge AI to transform the way you work.', 'Join thousands of teams already moving faster with AI.'];
  const urlFor = n => n.replace(/\s*AI$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '') + '.ai';

  /* ---------- part four: the statement and the answer ---------- */
  const ygi = $('ygi'), ywin = $('ywin'), yvp = $('yvp'), ypg = $('ypg'), ygen = $('ygen'), yedge = $('yedge'), sh = $('sh'), yslot = $('yslot');
  new ResizeObserver(() => yvp.style.setProperty('--s', (yvp.clientWidth / 960).toFixed(4))).observe(yvp);
  const WAVE = [6, 12, 22, 14, 30, 18, 9, 24, 34, 20, 12, 26, 16, 8, 19, 28, 13, 22, 10, 6, 15, 24, 30, 17, 9, 13, 21, 11, 7, 5];
  // photographs for the hand-made pages, inlined so the page stays one file (Unsplash License; credits in photos/SOURCES.md)
  const PHOTOS = { lex: '/home/lex.webp' };   // Gylain Omer, unsplash.com/photos/pXKv-0-aYDY
  const DESIGNS = {
    'AI note-taker for doctors': ['t-med', '#3d7a5c', `
      <div class="yn"><span class="yl"><i class="mk"></i>MediScribe</span><span class="yk"><span>How it works</span><span>Security</span><span>Pricing</span></span><span class="yb">Book a demo</span></div>
      <div class="yh"><div><h3>Look at your <em>patient</em>, not your screen.</h3>
        <p class="ys">MediScribe listens to the visit and writes the note in your words, ready to sign before the next patient walks in.</p>
        <div class="yc"><span class="y1">Start free trial</span><span>&#9654;&#xFE0E;&nbsp; Hear a sample</span></div></div>
        <div class="note"><div class="nt"><b>Visit note</b><span>09:42 · Dr. Amin</span></div>
          <div class="nl"><i>S</i>Dry cough for 3 days, worse at night.</div>
          <div class="nl"><i>O</i>Temp 37.9 °C. Chest clear.</div>
          <div class="nl"><i>A</i>Likely viral bronchitis.</div>
          <div class="nl"><i>P</i>Rest, fluids, review in a week.</div>
          <div class="nf"><span>Drafted in 40 s</span><span class="sg">Sign note</span></div></div></div>`],
    'An agent that books my meetings': ['t-book', '#2a45ff', `
      <div class="yn"><span class="yl"><i class="mk"></i>bookly</span><span class="yk"><span>How it works</span><span>Pricing</span></span><span class="yb">Add to Gmail</span></div>
      <div class="yh"><div><h3>Never type “does Tuesday work?” again.</h3>
        <p class="ys">Cc Bookly on any email. It finds a time that suits everyone, sends the invite and handles the reschedule.</p>
        <div class="yc"><span class="y1">Try it free</span><span>See how it works</span></div></div>
        <div class="mail"><div class="m1"><span class="mh">To: Sam · Cc: Bookly</span>Hi Sam, looping in Bookly to find us a time.</div>
          <div class="m2"><span class="mh">Bookly</span>Done. Tuesday at 14:30 works for you both. The invite is in your calendars.<br><span class="tag">Booked</span></div></div></div>`],
    'ChatGPT for lawyers': ['t-lex', '#e9e1cf', `
      <div class="yn"><span class="yl"><svg viewBox="0 0 17 17" aria-hidden="true"><path d="M2 15V2h3.2v10.2H15V15z" fill="#191917"/><path d="M8 2h7v3H8z" fill="#191917" opacity=".35"/></svg>LexGPT</span><span class="yk"><span>Platform</span><span>For firms</span><span>Security</span><span>Pricing</span></span><span class="yb">Book a demo</span></div>
      <div class="lh"><div class="lt"><div><span class="le">Contract review for law firms</span>
          <h3>Read the contract in minutes. Bill for the judgement.</h3></div>
        <div><p class="ys">LexGPT redlines every clause, flags the risk and cites its sources, so your associates start from a reviewed first draft.</p>
          <span class="lb">Request a demo</span></div></div>
        <div class="lp">${PHOTOS.lex ? `<img src="${PHOTOS.lex}" alt="">` : ''}</div></div>`],
    'AI copilot for sales teams': ['t-sales', '#c4f24a', `
      <div class="yn"><span class="yl"><i class="mk"></i>SalesPilot</span><span class="yk"><span>Product</span><span>Customers</span><span>Pricing</span></span><span class="yb">Get a demo</span></div>
      <div class="yh"><div><h3>Know what to say <em>before</em> they ask.</h3>
        <p class="ys">SalesPilot listens to every call and gives each rep the next best line, live.</p>
        <div class="yc"><span class="y1">Get a demo</span><span class="y2">Watch a live call</span></div></div>
        <div class="call"><div class="ch"><span class="lv">● Live</span><span>Acme Corp · 12:04</span></div>
          <div class="wv">${WAVE.map(h => `<i style="height:${h}px"></i>`).join('')}</div>
          <div class="q"><span>Prospect</span>“What does it cost for 50 seats?”</div>
          <div class="sug"><span>Say next</span>“Annual plan, 18% off, and free onboarding.”</div></div></div>`]
  };
  // calm palettes for typed ideas: background, ink, accent, text on accent
  const GEN = [['#f1ede4', '#18181b', '#2f6b4f', '#f1ede4'], ['#0f1c26', '#efe9dc', '#e8b64c', '#0f1c26'], ['#ecf0f4', '#101828', '#2f52ff', '#ffffff'], ['#f6efe6', '#22150f', '#d6336c', '#ffffff']];
  function design(c) {
    let d = DESIGNS[c.idea];
    if (!d) {
      const h = [...c.idea].reduce((a, ch) => a + ch.charCodeAt(0), 0), p = GEN[h % GEN.length];
      d = ['t-gen', p[2], `
      <div class="yn"><span class="yl"><i class="mk"></i><span class="gn"></span></span><span class="yk"><span>How it works</span><span>Pricing</span></span><span class="yb">Sign in</span></div>
      <div class="yh"><div><h3 class="gh"></h3>
        <p class="ys">Built to do one job properly, so you get your hours back.</p>
        <div class="yc"><span class="y1">Get early access</span><span>See how it works</span></div></div>
        <div class="gv"><div class="gm"></div><div class="gl"><i></i><i></i><i></i></div></div></div>`];
      ypg.style.cssText = `--pb:${p[0]};--pi:${p[1]};--pa:${p[2]};--pc:${p[3]}`;
    } else ypg.removeAttribute('style');
    ypg.className = 'ypg ' + d[0];
    ypg.innerHTML = d[2];
    yslot.style.setProperty('--glow', d[1]);
    if (d[0] === 't-gen') {
      const name = c.name.replace(/\s*AI$/, '');
      let line = c.idea.replace(/\bmy\b/gi, 'your').replace(/\bme\b/gi, 'you').replace(/\bI'm\b/g, 'you’re').replace(/\bI\b/g, 'you').replace(/\s+/g, ' ');
      line = line[0].toUpperCase() + line.slice(1);
      if (!/[.!?]$/.test(line)) line += '.';
      ypg.querySelector('.gn').textContent = name;
      const gm = ypg.querySelector('.gm');
      gm.textContent = name.toLowerCase();
      gm.style.setProperty('--gs', Math.min(76, Math.floor(560 / name.length)) + 'px');
      const gh = ypg.querySelector('.gh');
      gh.textContent = line;
      gh.classList.toggle('lg', line.length > 40);
    }
    fillKit(c, d);
  }


  /* ---------- part five: the kit, drawn in their brand ---------- */
  const kit = $('kit'), kin = $('kin'), kslot = $('kslot'), kbento = $('kbento');
  // what each startup's kit says: its colours, its typefaces, a post, a video, a number worth tracking and three leads
  const KITS = {
    't-lex': { sw: [['Paper', '#F8F7F3'], ['Ink', '#191917'], ['Stone', '#CFC9BD'], ['Brass', '#9C7B4E']], ty: ['Newsreader', 'Inter Tight'],
      post: 'A 40-page contract, reviewed before your coffee cools.', m: ['Demo requests', '48', '+22%'],
      crm: [['Hale & Brook LLP', 'Demo booked'], ['Okafor Legal', 'Trial'], ['Lindqvist & Co', 'New lead']] },
    't-med': { sw: [['Linen', '#F2EEE5'], ['Pine', '#15332A'], ['Sage', '#3D7A5C'], ['Mint', '#E1EBE1']], ty: ['Instrument Serif', 'Inter Tight'],
      post: 'Your notes, written before the next patient walks in.', m: ['Trial sign-ups', '126', '+18%'],
      crm: [['Riverside Clinic', 'Demo booked'], ['Dr. Amara Osei', 'Trial'], ['Northgate Practice', 'New lead']] },
    't-book': { sw: [['Blue', '#2A45FF'], ['Cream', '#FFF6E6'], ['Sun', '#FFD84A'], ['Night', '#16163A']], ty: ['Bricolage Grotesque', 'Inter Tight'],
      post: 'Cc Bookly. Get your Tuesdays back.', m: ['Sign-ups', '2,340', '+31%'],
      crm: [['Sam Patel', 'Active'], ['Lena Fischer', 'Invited'], ['Noah Kim', 'Waitlist']] },
    't-sales': { sw: [['Night', '#0B110D'], ['Chalk', '#F1F5EE'], ['Volt', '#C4F24A'], ['Moss', '#141D17']], ty: ['Inter Tight', 'JetBrains Mono'],
      post: 'Your best rep, on every call.', m: ['Demo requests', '64', '+27%'],
      crm: [['Acme Corp', 'Demo booked'], ['Brightline', 'Trial'], ['Northwind', 'New lead']] }
  };
  const SERIES = [47, 48, 42, 44, 37, 39, 32, 34, 26, 28, 20, 15];   // the chart, in a 200×60 box: a good week
  const chartPath = () => {
    const P = SERIES.map((y, i) => [i * 188 / (SERIES.length - 1), y]);
    let d = `M${P[0][0]},${P[0][1]}`;
    for (let i = 0; i < P.length - 1; i++) {   // a soft curve through every point
      const a = P[i - 1] || P[i], b = P[i], c = P[i + 1], e = P[i + 2] || c;
      d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0].toFixed(1)},${c[1]}`;
    }
    return [d, `${d} L188,60 L0,60Z`, P[P.length - 1]];
  };
  const ICON = {
    heart: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.4S2.2 10 2.2 6.1A3 3 0 0 1 8 4.7a3 3 0 0 1 5.8 1.4C13.8 10 8 13.4 8 13.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    talk: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10v7H7.5L4.5 13v-2.5H3z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    share: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3.5 13 7l-3.5 3.5M13 7H7.5A4.5 4.5 0 0 0 3 11.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.2v9.6L10.4 6z" fill="currentColor"/></svg>'
  };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function fillKit(c, d) {
    const cls = d[0], yl = ypg.querySelector('.yl'), name = yl.textContent.trim(), head = ypg.querySelector('h3').textContent.trim();
    let k = KITS[cls];
    if (!k) {
      const v = n => ypg.style.getPropertyValue(n).trim().toUpperCase();
      k = { sw: [['Base', v('--pb')], ['Ink', v('--pi')], ['Accent', v('--pa')]], ty: ['Bricolage Grotesque', 'Inter Tight'],
        post: `${name} is live. Get your hours back.`, m: ['Sign-ups', '312', '+24%'],
        crm: [['Priya Nair', 'Active'], ['Tom Becker', 'Invited'], ['Ana Lima', 'Waitlist']] };
    }
    $('rname').textContent = name;
    kit.className = 'kit pad ' + cls;
    kit.style.cssText = ypg.getAttribute('style') || '';
    const mark = `<span class="kmk">${yl.firstElementChild.outerHTML}</span>`;
    const tile = s => kit.querySelector('.' + s);
    tile('klogo').innerHTML = `<div class="kq"><div class="klz"><span class="yl">${yl.innerHTML}</span></div><span class="kcap kmono">Logo</span><span class="kcap r kmono">Clear space</span></div>`;
    tile('kbrand').innerHTML = `<div class="kq"><div class="ksw">${k.sw.map(([n, h]) => `<div><i style="background:${h}"></i><b>${n}</b><span class="kmono">${h}</span></div>`).join('')}</div>
      <div class="kty"><span class="kaa kdf">Aa</span><span class="ktn kmono">${k.ty[0]}<br>${k.ty[1]}</span></div></div>`;
    tile('kpost').innerHTML = `<div class="kq"><div class="kph"><span class="kav">${mark}</span><b>${esc(name)}</b><span>· Sponsored</span></div>
      <p class="kpq kdf">${esc(k.post)}</p>
      <div class="kpf"><span>${ICON.heart}248</span><span>${ICON.talk}31</span><span>${ICON.share}18</span></div></div>`;
    const v = tile('kvid'), photo = cls === 't-lex' && PHOTOS.lex;
    v.classList.toggle('ph', !!photo);
    v.innerHTML = `${photo ? `<img src="${PHOTOS.lex}" alt="">` : `<span class="kvw kdf">${esc(name[0].toUpperCase())}</span>`}
      <span class="kpl">${ICON.play}</span><div class="kvt kdf">${esc(name)} in 60 seconds</div><div class="kvb kmono"><i></i><span>0:14 / 1:00</span></div>`;
    const [line, area, end] = chartPath();
    tile('ktrack').innerHTML = `<div class="kq"><div class="kmh"><span>${k.m[0]}</span><span>This week</span></div>
      <div class="kmn"><b class="kdf">${k.m[1]}</b><em>${k.m[2]}</em></div>
      <div class="kgr"><svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true"><path class="ga" d="${area}"/><path class="gl" d="${line}"/></svg><i class="gd" style="left:${end[0] / 2}%;top:${(end[1] / 60 * 100).toFixed(2)}%"></i></div></div>`;
    const ini = n => n.split(/\s+/).filter(w => /^[A-Z]/.test(w) && !/^Dr\.?$/.test(w)).slice(0, 2).map(w => w[0]).join('');
    tile('kcrm').innerHTML = `<div class="kq"><div class="kmh"><span>Pipeline</span><span>12 new this week</span></div>` +
      k.crm.map(([n, s], i) => `<div class="kr"><i>${ini(n)}</i><b>${esc(n)}</b><span class="${i ? '' : 'on'}">${s}</span></div>`).join('') + '</div>';
    // the headline of their site, mid-edit: the last phrase selected, the caret after it
    const sent = head.match(/[^.!?]+[.!?]+/g) || [head], last = sent[sent.length - 1].trim();
    let a, b;
    if (sent.length > 1 && last.split(' ').length <= 5) { a = head.slice(0, head.lastIndexOf(last)); b = last; }
    else { const w = head.split(' '); a = w.slice(0, -2).join(' ') + ' '; b = w.slice(-2).join(' '); }
    tile('kedit').innerHTML = `<div class="kq"><div class="keb"><span>Editing · Home</span><b>Publish</b></div>
      <div class="ketb"><span>B</span><span><i>I</i></span><span>Link</span><span>Aa</span></div>
      <p class="ket kdf">${esc(a)}<mark>${esc(b)}</mark><i class="kcar"></i></p>
      <p class="kes">${esc(ypg.querySelector('.ys').textContent.trim())}</p><div class="kef"><span>Saved</span><span>Preview</span></div></div>`;
  }
  // sizes the kit for this screen: the site's tile takes about two thirds of the height, the rest share what's left
  function layoutKit(f) {
    const ya = f.width / f.height, narrow = innerWidth <= 900;
    kit.style.setProperty('--ya', ya.toFixed(4));
    kit.style.removeProperty('--cw');
    kbento.style.removeProperty('height'); kbento.style.removeProperty('flex'); kin.style.removeProperty('justify-content');
    kit.style.removeProperty('--khh');
    const heads = [...kit.querySelectorAll('.kch')], hh = narrow ? 0 : Math.ceil(Math.max(...heads.map(e => e.getBoundingClientRect().height)));
    if (!narrow) kit.style.setProperty('--khh', hh + 'px');
    const b = kbento.getBoundingClientRect(), gap = parseFloat(getComputedStyle(kbento).rowGap) || 14;
    let cw;
    if (!narrow) {
      const colH = b.height - hh - gap;
      cw = Math.max(b.width * .36, Math.min(b.width * .5, colH * .64 * ya));
      // a tall screen: the site's tile is already as wide as it gets, so stop the columns at the height that suits it
      const want = Math.ceil(cw / ya / .64);
      if (want < colH - 8) { kbento.style.height = (want + hh + gap) + 'px'; kbento.style.flex = 'none'; kin.style.justifyContent = 'center'; }
      else kbento.style.removeProperty('flex');
    }
    else { const row = parseFloat(getComputedStyle(kit).getPropertyValue('--krow')) || 84; cw = Math.min(b.width, Math.max(b.width * .55, (b.height - 3 * row - 3 * gap) * ya)); }
    kit.style.setProperty('--cw', cw.toFixed(1) + 'px');
    const s = kslot.getBoundingClientRect(), z = s.width / f.width;
    kit.style.setProperty('--kr', (12 * z).toFixed(2) + 'px');
    // the logo fills about half its sheet
    const lz = kit.querySelector('.klz .yl'), lt = kit.querySelector('.klogo').getBoundingClientRect();
    kit.style.setProperty('--lz', 1);
    const lr = lz.getBoundingClientRect();
    kit.style.setProperty('--lz', Math.max(.6, Math.min(2.8, lt.width * .5 / lr.width, lt.height * .2 / lr.height)).toFixed(3));
    // on a short screen the kit runs past the bottom: it pans up once it has arrived
    const hr = hero.getBoundingClientRect();
    let bottom = 0;
    kit.querySelectorAll('.kt').forEach(t => { bottom = Math.max(bottom, t.getBoundingClientRect().bottom); });
    const over = Math.ceil(bottom - (hr.bottom - 14)), pan = over > 6 ? over : 0;   // a few px short of the margin isn't worth a move
    const to = dy => `translate(${(s.left - f.left).toFixed(2)}px,${(s.top - f.top - dy).toFixed(2)}px) scale(${z.toFixed(5)})`;
    return { to: to(0), toPan: to(pan), pan, z, sx: s.left + s.width / 2, sy: s.top + s.height / 2 };
  }

  // where the pass sits, and how far the price must pan up on a short screen
  function layoutPrice() {
    const r = document.querySelector('#pricing .tkm').getBoundingClientRect(), prin = $('prin');
    return { sx: r.left + r.width / 2, sy: r.top + r.height / 2, pan: Math.max(0, Math.ceil(prin.offsetHeight - hero.clientHeight)) };
  }

  /* ---------- the grid of look-alikes ---------- */
  function buildGrid(r) {
    const vw = innerWidth, vh = hero.clientHeight, small = vw < 760;
    const cw = Math.round(small ? vw * .36 : Math.min(230, Math.max(150, vw * .14)));
    const k = cw / r.width, ch = r.height * k, gap = small ? 10 : 16;
    const cols = Math.ceil(vw / (cw + gap)) + 2 | 1, above = Math.ceil(vh / 2 / (ch + gap)) + 1, rows = above * 2 + 4;
    const mc = cols >> 1, mr = above, mineAt = mr * cols + mc;
    const [noun, list] = CLONES[cur.idea] || CLONES[''];
    const names = list.split(',');
    if (cur.root) names.push(...['GPT', 'Flow AI', 'ly', ' AI', 'Pilot', 'ify', 'Bot'].map(s => cur.root + s).filter(n => n !== cur.name));
    const N = noun[0].toUpperCase() + noun.slice(1);
    // template: a copy of the build window in its finished state, minus ids and skeletons
    const tpl = win.cloneNode(true);
    tpl.removeAttribute('style'); tpl.className = 'win s1';
    const tpg = tpl.querySelector('.pg');
    tpg.className = 'pg s1 s2 s3 s4 s5 s6';
    tpl.querySelectorAll('.slot').forEach(e => e.classList.add('on'));
    tpl.querySelector('.wurl').textContent = cur.url;
    tpl.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    tpl.querySelectorAll('.sk').forEach(e => e.remove());
    let seed = 7;
    const rnd = n => (seed = (seed * 16807) % 2147483647) % n;   // repeatable picks, no visible bands
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cols * rows; i++) {
      const c = document.createElement('div'), w = tpl.cloneNode(true);
      c.className = 'mc';
      if (i === mineAt) c.classList.add('mine');
      else {
        const name = names[rnd(names.length)];
        w.querySelector('.pname').textContent = name;
        w.querySelector('.ph1 .rl').textContent = HEADS[rnd(HEADS.length)].replace('{n}', noun).replace('{N}', N);
        w.querySelector('.psub .rl').textContent = SUBS[rnd(SUBS.length)];
        w.querySelector('.wurl').textContent = urlFor(name);
        w.querySelector('.pbg').style.filter = `hue-rotate(${rnd(36) - 18}deg)`;
      }
      c.append(w); frag.append(c);
    }
    const twin = frag.cloneNode(true);   // the grey copy (each card greyed once, when it's painted)
    lgrid.replaceChildren(frag);
    lgridg.replaceChildren(twin);
    lgrid.style.cssText = `--cols:${cols};--cw:${cw}px;--gap:${gap}px;--chh:${ch.toFixed(2)}px;--ww:${r.width}px;--k:${k.toFixed(5)};--rad:${(12 * k).toFixed(2)}px`;
    const left = vw / 2 - (mc * (cw + gap) + cw / 2), top = vh / 2 - (mr * (ch + gap) + ch / 2);
    lgrid.style.left = left + 'px'; lgrid.style.top = top + 'px';
    lgridg.style.cssText = lgrid.style.cssText;
    // the camera starts so their card sits exactly where the preview window is
    const hr = hero.getBoundingClientRect();
    const fx = left + mc * (cw + gap), fy = top + mr * (ch + gap), z = 1 / k;
    const tx = (r.left - hr.left) - left - z * (fx - left), ty = (r.top - hr.top) - top - z * (fy - top);
    return {
      from: `translate(${tx}px,${ty}px) scale(${z})`,
      winTo: `translate(${fx + hr.left - r.left}px,${fy + hr.top - r.top}px) scale(${k})`,
      row: ch + gap, fx: fx + hr.left, fy: fy + hr.top, cw, ch
    };
  }

  /* ---------- the story as one timeline ----------
     Everything after the prompt bar is one timeline, counted in story-milliseconds. The page is tall and the hero sticks
     to the top; how far you've scrolled is where you are in the story. Every movement is a paused Web Animation whose
     time is set from the scroll, so scrolling back plays it backwards, exactly. Build my idea and Launch now simply
     scroll the page for you at story speed, and any scroll of yours takes over. */
  const STEP = 720, RUN = 600, LEAD = 900;               // one log line every 0.72s, once the idea has landed in the log
  const BUILD = (steps.length - 1) * STEP + RUN;          // 4.2s of building, shown on the clock as 15s
  const T_DONE = LEAD + BUILD;                           // ready
  const T_LAUNCHABLE = T_DONE + 450;                     // Launch now appears
  const A_END = T_DONE + 900;                            // where Build my idea stops
  const L = A_END + 900;                                 // the launch (a short hold before it)
  const G = L + 250;                                     // the camera starts pulling back
  const SOLVED = G + 12900;                              // the answer is complete: where Launch now stops
  const K0 = SOLVED + 600;                               // keep scrolling: the kit unfolds
  const P0 = K0 + 3900;                                  // the kit folds into the receipt printer
  const END = P0 + 3700;                                 // the receipt has printed; a short hold, then the page ends
  const RATE = .3, DEAD = 24;                            // px of scroll per story-ms; a little dead zone at the top
  const E_OUT = 'cubic-bezier(.2,.7,.2,1)', E_IO = 'cubic-bezier(.4,0,.2,1)', SOFT = 'cubic-bezier(.42,0,.3,1)';
  const SPEED = .82;                                      // autoplay runs the story a little slower than real time
  const story = $('story'), main = [...document.querySelectorAll('.main>*')];
  const ldim = document.querySelector('.ldim'), lmsg = document.querySelector('.lmsg'), ldim2 = document.querySelector('.ldim2'), sdim = document.querySelector('.sdim');
  const blog = document.querySelector('.blog'), bfoot = document.querySelector('.bfoot'), buildEl = $('build'), nav = document.querySelector('.nav');
  const yveil = document.querySelector('.yveil');

  let TL = [], geo = null, fly = null, flyEnd = 0;
  // one paused animation per element and property, keyframed at story times: [[t, value, easing to the next], ...]
  function track(el, prop, pts, pseudo) {
    const kf = pts.map(([t, v, e]) => ({ offset: Math.min(1, Math.max(0, t / END)), [prop]: v, easing: e === 'ease' ? SOFT : e || 'linear' }));
    if (kf[0].offset > 0) kf.unshift({ offset: 0, [prop]: pts[0][1] });
    if (kf[kf.length - 1].offset < 1) kf.push({ offset: 1, [prop]: pts[pts.length - 1][1] });
    const o = { duration: END, fill: 'both' };
    if (pseudo) o.pseudoElement = pseudo;
    const a = el.animate(kf, o);
    a.pause(); TL.push(a);
  }
  const fadeIn = (el, t, d, dy, e = E_OUT) => {
    track(el, 'opacity', [[t, 0, 'ease'], [t + d, 1]]);
    if (dy) track(el, 'transform', [[t, `translateY(${dy}px)`, e], [t + d + 200, 'none']]);
  };

  function prepare(idea) {
    const [name, h1, sub, root] = productFor(idea);
    cur = { idea, name, h1, root, url: urlFor(name) };
    $('bidea').textContent = idea;
    pg.querySelector('.pname').textContent = name;
    $('ph1').textContent = h1; $('psub').textContent = sub;
    $('bname').textContent = name;
    fit();
    design(cur);
    build();
  }

  // everything that depends on the layout: the grid, the copies, and every track
  function build() {
    TL.forEach(a => a.cancel()); TL = [];
    const hr = hero.getBoundingClientRect(), r = win.getBoundingClientRect();
    geo = buildGrid(r);
    const mine = lgrid.querySelector('.mc.mine'), g = mine.querySelector('.pg').cloneNode(true);
    g.removeAttribute('style');
    ygi.replaceChildren(g);
    $('yurl').textContent = cur.url;

    /* part one leaves */
    track(nav, 'opacity', [[0, 1, 'ease'], [600, 0], [G + 12400, 0, E_OUT], [G + 12900, 1]]);
    track(nav, 'transform', [[0, 'none', 'ease'], [600, 'translateY(-6px)'], [G + 12400, 'translateY(-6px)', E_OUT], [G + 12900, 'none']]);
    main.forEach((el, i) => {
      const t = i === 1 ? 60 : 0;
      track(el, 'opacity', [[t, 1, 'ease'], [t + 600, 0]]);
      track(el, 'transform', [[t, 'none', 'ease'], [t + 600, 'translateY(-6px)']]);
    });
    // the idea lifts out of the bar and lands as the first line of the build log
    if (!fly) { fly = document.createElement('span'); fly.className = 'fly'; fly.setAttribute('aria-hidden', 'true'); hero.append(fly); }
    // The idea itself flies: it starts exactly where the typed text sits and lands in the title's place in the log.
    // When the title fits on one line the flying copy simply stays there as the title (the real one is only a
    // placeholder), so there is no hand-over at the end and nothing can jump in any browser. It leaves with the log.
    const cs = getComputedStyle(input), ir = input.getBoundingClientRect(), bi = $('bidea'), bcs = getComputedStyle(bi), br = bi.getBoundingClientRect();
    const fs = parseFloat(cs.fontSize), ts = parseFloat(bcs.fontSize), k = (ts / fs).toFixed(5), fly8 = 'cubic-bezier(.5,0,.15,1)';
    fly.textContent = cur.idea; fly.style.fontSize = fs + 'px'; fly.style.fontFamily = cs.fontFamily; fly.style.letterSpacing = cs.letterSpacing;
    const x0 = (ir.left - hr.left + parseFloat(cs.paddingLeft)).toFixed(2), y0 = Math.round(Math.round(ir.top - hr.top) + (ir.height - fs * 1.3) / 2);   // the input snaps its box to a whole pixel, then its text line: the copy starts on that same row
    const x1 = (br.left - hr.left).toFixed(2), y1 = br.top - hr.top;
    const at = (x, y, sc) => `translate(${x}px,${typeof y === 'number' ? y.toFixed(2) : y}px) scale(${sc})`;
    const oneLine = br.height < ts * 1.3 * 1.5;
    flyEnd = oneLine ? L + 400 : 1000;
    if (oneLine) {
      track(fly, 'transform', [[0, at(x0, y0, 1), fly8], [820, at(x1, y1, k)], [L, at(x1, y1, k), 'ease'], [L + 400, at(x1, y1 - 6, k)]]);
      track(fly, 'opacity', [[0, 1], [L, 1, 'ease'], [L + 400, 0]]);   // fully there on the very frame the typed text hides (shown by visibility)
      track(bi, 'opacity', [[0, 0], [1, 0]]);
    } else {
      // a long idea that wraps in the log (small phones): it lands, then softly gives way to the wrapped title
      track(fly, 'transform', [[0, at(x0, y0, 1), fly8], [820, at(x1, y1, k)]]);
      track(fly, 'opacity', [[0, 1], [760, 1, 'ease'], [1000, 0]]);
      track(bi, 'opacity', [[760, 0, 'ease'], [1000, 1]]);
    }

    /* part two: the build */
    track(buildEl, 'opacity', [[250, 0, 'ease'], [750, 1]]);
    track(win, 'opacity', [[LEAD, 0, 'ease'], [LEAD + 450, 1], [G + 550, 1, 'ease'], [G + 1000, 0]]);
    const zoom = 'cubic-bezier(.45,.05,.2,1)';
    track(win, 'transform', [[LEAD, 'translateY(10px) scale(.985)', 'ease'], [LEAD + 450, 'none'], [G, 'none', zoom], [G + 2200, geo.winTo]]);
    track(blog, 'opacity', [[L, 1, 'ease'], [L + 400, 0]]);
    track(blog, 'transform', [[L, 'none', 'ease'], [L + 400, 'translateY(-6px)']]);
    track(bfoot, 'opacity', [[T_LAUNCHABLE, 0, 'ease'], [T_LAUNCHABLE + 450, 1], [L, 1, 'ease'], [L + 400, 0]]);
    track(bfoot, 'transform', [[T_LAUNCHABLE, 'translateY(8px)', 'ease'], [T_LAUNCHABLE + 450, 'none'], [L, 'none', 'ease'], [L + 400, 'translateY(-6px)']]);

    /* part three: the launch. The grid is painted at 1% while Launch now waits, so the zoom starts without a hitch */
    track(lpan, 'opacity', [[T_DONE - 600, 0], [T_DONE - 599, .01], [G, .01, 'ease'], [G + 500, 1]]);
    track(lgrid, 'transform', [[G, geo.from, zoom], [G + 2200, 'none']]);
    track(lpan, 'transform', [[G + 2250, 'none', 'cubic-bezier(.3,0,.25,1)'], [G + 8650, `translateY(${-(geo.row * 1.6).toFixed(1)}px)`]]);
    // the grey twin fades in on top: nothing is filtered while it happens
    track(lgridg, 'opacity', [[G + 3650, .01, E_IO], [G + 4550, 1]]);
    // the dark layer and the question are painted at 1% as soon as the zoom settles
    track(ldim, 'opacity', [[G + 2500, 0], [G + 2501, .01], [G + 3900, .01, E_IO], [G + 4700, 1]]);
    track(lmsg, 'opacity', [[G + 2500, 0], [G + 2501, .01], [G + 3900, .01, E_IO], [G + 4450, 1], [G + 6900, 1, 'ease'], [G + 7500, 0]]);
    track(lmsg.querySelector('h2'), 'transform', [[G + 3900, 'translateY(10px)', E_OUT], [G + 4900, 'none']]);
    fadeIn(lmsg.querySelector('p'), G + 5000, 600, 4);

    /* part four: the statement and the answer */
    track(ldim2, 'opacity', [[G + 6900, 0, 'ease'], [G + 7900, .35]]);
    track(cv, 'opacity', [[G + 6900, 1, 'ease'], [G + 8100, 0]]);
    // the statement sits in the middle of the screen, then slides into its place in the left column
    const s1 = sh.querySelector('.s1'), s2 = sh.querySelector('.s2');
    const rg = document.createRange(); rg.selectNodeContents(s1);
    const t1 = rg.getBoundingClientRect();
    const dx = hr.left + hr.width / 2 - (t1.left + t1.width / 2), dy = hr.top + hr.height / 2 - (t1.top + t1.height / 2);
    const centre = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    track(sh, 'transform', [[G + 9000, centre, 'cubic-bezier(.45,0,.15,1)'], [G + 10150, 'none']]);
    fadeIn(s1, G + 7500, 800, 10);
    track(s1, 'color', [[G + 11150, '#f4f4f1', 'ease'], [G + 12050, '#77777c']]);
    // their window: painted at 1% exactly over their card, then it lifts out and flies to the right column
    const f = ywin.getBoundingClientRect();
    const cx = geo.fx, cy = geo.fy - geo.row * 1.6;
    const lift = `translate(${(cx - f.left).toFixed(2)}px,${(cy - f.top).toFixed(2)}px) scale(${(geo.cw / f.width).toFixed(5)},${(geo.ch / f.height).toFixed(5)})`;
    track(ywin, 'opacity', [[G + 7300, 0], [G + 7301, .01], [G + 9000, .01], [G + 9001, 1], [P0 + 600, 1, 'ease'], [P0 + 1000, 0]]);
    const kg = layoutKit(f), KE = 'cubic-bezier(.5,0,.15,1)';
    const pf = layoutPrice(), z2 = kg.z * .2;
    const yFold = `translate(${(pf.sx - f.width * z2 / 2 - f.left).toFixed(2)}px,${(pf.sy - f.height * z2 / 2 - f.top).toFixed(2)}px) scale(${z2.toFixed(5)})`;
    track(ywin, 'transform', [[G + 9080, lift, 'cubic-bezier(.62,0,.2,1)'], [G + 10380, 'none'], [K0 + 150, 'none', KE], [K0 + 1450, kg.to],
      ...(kg.pan ? [[K0 + 2500, kg.to, 'ease'], [K0 + 3300, kg.toPan]] : []), [P0 + 250, kg.pan ? kg.toPan : kg.to, 'cubic-bezier(.55,0,.3,1)'], [P0 + 1000, yFold]]);
    track(yveil, 'opacity', [[G + 9100, .78, 'ease'], [G + 10100, 0]]);
    track(sdim, 'opacity', [[G + 9000, 0, 'ease'], [G + 10200, 1]]);
    // the hand-made page wipes across the generic one, led by a thin line of light: two opposing transforms, no repaint
    const w = yvp.clientWidth, wipe = 'cubic-bezier(.65,0,.35,1)';
    track(ygen, 'transform', [[G + 10350, 'translateX(0)', wipe], [G + 11350, `translateX(${w}px)`]]);
    track(ygi, 'transform', [[G + 10350, 'translateX(0)', wipe], [G + 11350, `translateX(${-w}px)`]]);
    track(yedge, 'transform', [[G + 10350, 'translateX(0)', wipe], [G + 11350, `translateX(${w}px)`]]);
    track(yedge, 'opacity', [[G + 10350, 0], [G + 10470, 1], [G + 11200, 1], [G + 11350, 0]]);
    // "Yours won't." and the answer
    fadeIn(s2, G + 11150, 700, 12);
    track(yslot, 'opacity', [[G + 11150, 0, 'ease'], [G + 12350, 1], [K0, 1, 'ease'], [K0 + 450, 0]], '::before');
    fadeIn(sh.parentNode.querySelector('.sp'), G + 11900, 600, 8);
    fadeIn(sh.parentNode.querySelector('.sbtns'), G + 12050, 600, 8);
    fadeIn($('again2'), G + 12250, 600, 8);

    /* part five: the kit unfolds. The words leave, the crowd goes dark, their site shrinks into the middle of the kit
       and the other pieces slide out from behind it */
    const stext = sh.parentNode;
    track(stext, 'opacity', [[K0, 1, 'ease'], [K0 + 450, 0]]);
    track(stext, 'transform', [[K0, 'none', 'ease'], [K0 + 450, 'translateY(-10px)']]);
    track(document.querySelector('.kcue'), 'opacity', [[G + 12300, 0, 'ease'], [SOLVED, 1], [K0, 1, 'ease'], [K0 + 300, 0]]);
    track(document.querySelector('.kdim'), 'opacity', [[K0, 0, 'ease'], [K0 + 900, 1]]);
    const P = SOLVED + 150;   // nothing moves between the answer and the kit: the kit's layers are painted here, at 1%
    // in at t (painted at 1% from `from`), and out again at `out` if given
    const kIn = (el, t, d, dy, out, from = P) => {
      track(el, 'opacity', [[from, 0], [from + 1, .01], [t, .01, 'ease'], [t + d, 1], ...(out ? [[out, 1, 'ease'], [out + 400, 0]] : [])]);
      if (dy) track(el, 'transform', [[t, `translateY(${dy}px)`, E_OUT], [t + d + 200, 'none'], ...(out ? [[out, 'none', 'ease'], [out + 400, 'translateY(-8px)']] : [])]);
    };
    kIn(kit.querySelector('.k1'), K0 + 650, 700, 10, P0);
    kIn(kit.querySelector('.k2'), K0 + 850, 700, 10, P0 + 40);
    kIn(kit.querySelector('.kp'), K0 + 1100, 700, 8, P0 + 80);
    kIn(kit.querySelector('.klist'), K0 + 1250, 700, 8, P0 + 80);
    kIn(kslot, K0 + 1250, 350, 0, P0 + 250);
    const tiles = [...kit.querySelectorAll('.kt')].map(el => {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      return { el, dx: (kg.sx - x) * .32, dy: (kg.sy - y) * .32, d: Math.hypot(kg.sx - x, kg.sy - y) };
    }).sort((p, q) => p.d - q.d);
    /* part six: everything folds into the pass, farthest first */
    const pg6 = layoutPrice(), FOLD = 'cubic-bezier(.55,0,.3,1)';
    const fold = [...tiles].sort((p, q) => q.d - p.d);
    tiles.forEach((o, i) => {
      const t = K0 + 1050 + i * 85, r = o.el.getBoundingClientRect(), j = fold.indexOf(o), o2 = P0 + 150 + j * 45;
      const fx2 = pg6.sx - (r.left + r.width / 2), fy2 = pg6.sy - (r.top + r.height / 2 - kg.pan);
      kIn(o.el, t, 550, 0, o2 + 300);
      track(o.el, 'transform', [[t, `translate(${o.dx.toFixed(1)}px,${o.dy.toFixed(1)}px)`, E_OUT], [t + 1050, 'none'],
        [o2, 'none', FOLD], [o2 + 700, `translate(${fx2.toFixed(1)}px,${fy2.toFixed(1)}px) scale(.2)`]]);
    });
    kit.querySelectorAll('.kch').forEach((el, i) => kIn(el, K0 + 1150 + i * 110, 650, 8, P0 + 40));   // the list arrives with the headline, before the pieces
    track(kit.querySelector('.kgr svg'), 'clipPath', [[K0 + 1750, 'inset(0 100% 0 0)', E_IO], [K0 + 2850, 'inset(0 0% 0 0)']]);
    track(kit.querySelector('.gd'), 'opacity', [[K0 + 2700, 0, 'ease'], [K0 + 2950, 1]]);
    if (kg.pan) track(kin, 'transform', [[K0 + 2500, 'none', 'ease'], [K0 + 3300, `translateY(${-kg.pan}px)`]]);

    // the price: painted at 1% once the kit has settled, then the pass, the words, and the trip
    const PP = K0 + 3450, prc = $('pricing'), RIDE = 'cubic-bezier(.45,0,.4,1)';
    // on a short screen the words pan up under the menu bar: each one fades out just before it gets there
    const prinEl = $('prin'), PAN0 = P0 + 1250, PAN1 = P0 + 2700, NAVZ = 112;
    const away = (el, after) => {
      if (!pg6.pan) return 0;
      let y = 0;   // `after`: not before it has finished arriving
      for (let e = el; e && e !== prinEl; e = e.offsetParent) y += e.offsetTop;
      if (y - pg6.pan >= NAVZ) return 0;   // still clear of the menu bar at the end
      const f = Math.max(0, Math.min(1, (y - NAVZ) / pg6.pan));
      return Math.round(Math.max(after + 220, Math.min(PAN1 - 400, PAN0 + (PAN1 - PAN0) * f - 250)));
    };
    kIn(prc.querySelector('.tk'), P0 + 650, 500, 14, 0, PP);
    kIn(prc.querySelector('.peye'), P0 + 900, 600, 8, away(prc.querySelector('.peye'), P0 + 1500), PP);
    prc.querySelectorAll('.ph span').forEach((el, i) => kIn(el, P0 + 1000 + i * 180, 700, 10, away(el, P0 + 1700 + i * 180), PP));
    kIn(prc.querySelector('.pp'), P0 + 1400, 700, 8, away(prc.querySelector('.pp'), P0 + 2100), PP);
    kIn(prc.querySelector('.pbtns'), P0 + 1550, 600, 8, away(prc.querySelector('.pbtns'), P0 + 2150), PP);
    kIn(prc.querySelector('.pnotes'), P0 + 1750, 700, 8, 0, PP);
    // the dot rides Idea → Live at an even pace and punches each day as it passes; Live lights up as it lands
    const R0 = P0 + 1200, R1 = P0 + 2600, PUNCH = 'cubic-bezier(.3,1.5,.55,1)';
    track(prc.querySelector('.tkfill'), 'transform', [[R0, 'scaleX(0)'], [R1, 'scaleX(1)']]);
    track(prc.querySelector('.tkgo'), 'transform', [[R0, 'translateX(0%)'], [R1, 'translateX(100%)']]);
    track(prc.querySelector('.tkto'), 'opacity', [[PP, 0], [PP + 1, .3], [R1 - 150, .3, 'ease'], [R1 + 100, 1]]);
    prc.querySelectorAll('.tkd li').forEach((el, i) => {
      const t = Math.round(R0 + (R1 - R0) * (i + 1) / 5) - 120;
      track(el, 'opacity', [[t, .38, 'ease'], [t + 260, 1]]);
      track(el.querySelector('.tkx b'), 'transform', [[t, 'scale(0)', PUNCH], [t + 280, 'scale(1)']]);
    });
    // then the fare
    kIn(prc.querySelector('.tkp'), R1 + 100, 450, 8, 0, PP);
    // the monthly stub tears away along the perforation
    track(prc.querySelector('.tks'), 'transform', [[P0 + 2900, 'none', 'cubic-bezier(.5,0,.2,1)'], [P0 + 3220, 'translate(4px,16px) rotate(2.2deg)'], [P0 + 3390, 'translate(6px,20px) rotate(1.6deg)']]);
    if (pg6.pan) track(prinEl, 'transform', [[PAN0, 'none', 'cubic-bezier(.3,0,.5,1)'], [PAN1, `translateY(${-pg6.pan}px)`]]);

    seek(Tcur);
  }

  /* the things that switch rather than move: log lines, page stages, labels, what can be clicked */
  let shown = {};
  const text = (el, v) => { if (shown[el.id] !== v) { shown[el.id] = v; el.textContent = v; } };
  function discrete(T) {
    const c = hero.classList, on = (k, v) => c.toggle(k, v);
    on('leaving', T > 0); on('building', T > 0);
    if (fly) fly.style.visibility = T > 0 && T < flyEnd ? '' : 'hidden';   // never left behind once its part is over
    input.style.color = T > 0 ? 'transparent' : '';
    let lvl = T >= LEAD ? 1 : 0;
    steps.forEach((li, i) => {
      const s = LEAD + i * STEP, cls = T >= s + RUN ? 'done' : T >= s ? 'run' : '';
      if (li.className !== cls) li.className = cls;
      if (cls === 'done') lvl = Math.max(lvl, i + 1);
    });
    for (let i = 1; i <= 6; i++) pg.classList.toggle('s' + i, i <= lvl);
    win.classList.toggle('s1', lvl >= 1);
    slots.forEach(s => s.classList.toggle('on', +s.dataset.at <= lvl));
    const k = Math.min(1, Math.max(0, (T - LEAD) / BUILD)), ready = T >= T_DONE;
    text($('bclock'), '00:' + String(Math.floor(k * 15)).padStart(2, '0'));
    const bs = $('bstate');   // the two words are edited in Sanity (Homepage > Build)
    text(bs, ready ? bs.dataset.ready || 'Ready' : bs.dataset.building || 'Building');
    text($('wurl'), ready && cur ? cur.url : 'localhost:3000');
    on('built', ready);
    on('launchable', T >= T_LAUNCHABLE);
    on('prepped', T >= T_DONE - 600);
    on('launching', T >= L);
    on('launched', T >= G);
    on('zoomed', T >= G + 2260);
    on('lost', T >= G + 2500);
    on('greyed', T >= G + 4650);
    on('yprep', T >= G + 7300);
    on('p4c', T >= G + 9000);
    on('p4d', T >= G + 10400);
    on('p4e', T >= G + 11900);
    on('solved', T >= G + 12400);
    on('kitin', T >= SOLVED + 150);
    on('kitfly', (T >= K0 + 100 && T < K0 + 3300) || (T >= P0 + 150 && T < P0 + 1100));   // their site keeps its layer while it moves
    on('kitout', T >= K0 + 450);
    on('kitdark', T >= K0 + 900);
    on('pon', T >= K0 + 3450);
    on('kitgone', T >= P0 + 1100);
    on('plive', T >= P0 + 1550);
    on('pset', T >= P0 + 3400);
    markNav(T >= P0 + 300 ? 'pricing' : T >= K0 + 300 ? 'included' : '');
    if (!c.contains('lost') && !raf && !reduce && !document.hidden) raf = requestAnimationFrame(loop);
  }
  // the menu shows which part of the story is on screen
  var navNow, navLinks;
  function markNav(id) {
    if (id === navNow) return;
    navNow = id;
    navLinks = navLinks || [...document.querySelectorAll('.links a[href^="#"]')];
    navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + id));
  }
  function seek(T) {
    for (const a of TL) a.currentTime = T;
    discrete(T);
  }

  /* ---------- scroll ⇄ story time ---------- */
  /* The prompt bar doesn't scrub: there the page doesn't scroll at all, and only Build my idea moves the story on.
     From then on the page is as long as the whole story (the "gate" is open), so scrolling scrubs forwards and
     backwards. Scrolling all the way back to the prompt bar closes the gate again. */
  let gate = 0;
  const toT = y => Math.max(0, Math.min(gate, (y - DEAD) / RATE));
  const toY = T => T <= 0 ? 0 : Math.round(T * RATE + DEAD);
  // 100vh is the tallest the viewport gets, so the gate is always reachable
  const setHeight = () => { story.style.height = gate ? `calc(100vh + ${toY(gate)}px)` : ''; };
  const setGate = g => { if (g !== gate) { gate = g; document.documentElement.classList.toggle('open', g > 0); setHeight(); } };
  let Tcur = 0, Tgoal = 0, auto = null, rafS = 0, lastNow = 0, wantY = -1;
  function tick(now) {
    rafS = 0;
    const dt = lastNow ? Math.min(50, now - lastNow) : 16;
    lastNow = now;
    if (auto) {
      const x = Math.min(1, (now - auto.t0) / auto.D), a = auto.a, b = auto.b, v = 1 / (1 - a / 2 - b / 2);
      const p = x < a ? v * x * x / (2 * a) : x > 1 - b ? 1 - v * (1 - x) * (1 - x) / (2 * b) : v * (a / 2 + x - a);
      const T = x >= 1 ? auto.to : auto.from + (auto.to - auto.from) * p;
      Tgoal = Tcur = T;
      wantY = toY(T);
      if (Math.abs(scrollY - wantY) > .5) scrollTo(0, wantY);
      if (T >= auto.to) { const done = auto.done; auto = null; done && done(); }
    } else {
      // ease towards wherever the scroll is, so a notched mouse wheel still scrubs smoothly
      const d = Tgoal - Tcur;
      Tcur = Math.abs(d) < .5 ? Tgoal : Tcur + d * (1 - Math.exp(-dt / 110));
    }
    seek(Tcur);
    if (auto || Tcur !== Tgoal) rafS = requestAnimationFrame(tick); else lastNow = 0;
  }
  const kick = () => { if (!rafS) rafS = requestAnimationFrame(tick); };
  function play(to, done) {
    setGate(END);
    if (Tcur >= to) { done && done(); return; }
    if (reduce) { auto = null; Tgoal = Tcur = to; scrollTo(0, toY(to)); seek(to); done && done(); return; }
    // a gentle start and a gentle stop: the page eases into the story's pace and settles at the end
    const D0 = (to - Tcur) / SPEED, R1 = Math.min(600, D0 * .3), R2 = Math.min(900, D0 * .3), D = D0 + (R1 + R2) / 2;
    auto = { from: Tcur, to, t0: performance.now(), done, D, a: R1 / D, b: R2 / D };
    wantY = scrollY; lastNow = 0; kick();
  }
  const takeOver = () => { if (auto) { auto = null; Tgoal = toT(scrollY); } };
  addEventListener('wheel', takeOver, { passive: true });
  addEventListener('touchstart', takeOver, { passive: true });
  const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
  addEventListener('keydown', e => { if (SCROLL_KEYS.has(e.key) && !(e.target.closest && e.target.closest('input'))) takeOver(); });
  addEventListener('scroll', () => {
    if (auto) { if (Math.abs(scrollY - wantY) > 3) takeOver(); else return; }
    Tgoal = toT(scrollY);
    if (Tgoal <= 0) setGate(0);   // back at the prompt bar: locked again until Build my idea
    if (Tgoal > 0 && document.activeElement === input) input.blur();
    if (!cur) { Tgoal = 0; return; }
    kick();
  }, { passive: true });

  // the story needs an idea: an empty bar gets the first example, and a changed idea is prepared before it plays
  function ensureIdea() {
    // a chip still typing itself in counts as its whole idea
    const pressed = chips.find(o => o.getAttribute('aria-pressed') === 'true');
    if (pressed && pressed.textContent.trim() !== input.value.trim() && pressed.textContent.trim().startsWith(input.value.trim())) {
      clearInterval(typing); input.value = pressed.textContent.trim(); sync();
    }
    let idea = input.value.trim();
    if (!idea) {
      clearInterval(typing);
      idea = chips[0].textContent.trim();
      input.value = idea; sync();
      chips.forEach(o => o.setAttribute('aria-pressed', o === chips[0] ? 'true' : 'false'));
    }
    if (!cur || cur.idea !== idea) prepare(idea);
  }
  // prepare ahead, while the visitor is still at the top, so the first scroll never waits for the heavy work
  let prepT = 0;
  const prepSoon = () => { clearTimeout(prepT); prepT = setTimeout(() => { const v = input.value.trim(); if (v && Tcur === 0 && (!cur || cur.idea !== v)) prepare(v); }, 350); };
  input.addEventListener('input', prepSoon);

  /* ---------- buttons ---------- */
  $('ask').addEventListener('submit', e => {
    e.preventDefault();
    if (!input.value.trim()) return;
    clearInterval(typing);
    input.blur();
    ensureIdea();
    play(A_END, () => $('launch').focus({ preventScroll: true }));
  });
  $('launch').addEventListener('click', () => { if (cur) play(SOLVED, () => $('cta').focus({ preventScroll: true })); });
  const startOver = () => {
    auto = null;
    input.value = ''; sync();
    chips.forEach(o => o.setAttribute('aria-pressed', 'false'));
    Tgoal = Tcur = 0; seek(0); setGate(0);
    scrollTo(0, 0);
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  };
  document.querySelectorAll('a[href="#top"]').forEach(a => a.addEventListener('click', e => e.preventDefault()));   // placeholders for now

  /* ---------- the menu and the in-page links ----------
     Places inside the pinned story are moments in it (the kit, the price); the sections after the story are ordinary
     anchors once the gate is open. Either way the story is set to the right moment first, with the first example idea
     if the visitor hasn't typed one, and the page jumps there (a long smooth scroll would replay the story at speed). */
  const STOPS = { included: K0 + 3350, pricing: P0 + 3450 };
  function goTo(id) {
    const el = document.getElementById(id), inStory = id in STOPS;
    if (!inStory && (!el || !(story.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))) return false;
    clearInterval(typing);
    input.blur();
    ensureIdea();
    auto = null;
    setGate(END);
    const T = inStory ? STOPS[id] : END;
    Tgoal = Tcur = T; seek(T);
    scrollTo({ top: inStory ? toY(T) : el.getBoundingClientRect().top + scrollY, behavior: 'instant' });
    const h = inStory ? (id === 'pricing' ? $('price-h') : null) : el.querySelector('h2');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    return true;
  }
  document.querySelectorAll('a[href^="#"]:not([href="#top"])').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    if (goTo(id)) { e.preventDefault(); history.replaceState(null, '', '#' + id); }
  }));
  // the logo: back to the prompt bar, keeping whatever idea is in it
  $('home').addEventListener('click', e => {
    e.preventDefault();
    auto = null;
    Tgoal = Tcur = 0; seek(0); setGate(0);
    scrollTo({ top: 0, behavior: 'instant' });
    history.replaceState(null, '', location.pathname + location.search);
  });
  // a shared link such as /#pricing opens at that part
  if (location.hash.length > 1) setTimeout(() => goTo(location.hash.slice(1)), 120);
  $('again').addEventListener('click', startOver);
  $('again2').addEventListener('click', startOver);

  // a new size re-measures everything (only when the width or the hero's height really changes, not for a phone's toolbar)
  let size = [hero.clientWidth, hero.clientHeight], rsz = 0;
  const remeasure = () => {
    clearTimeout(rsz);
    rsz = setTimeout(() => {
      const n = [hero.clientWidth, hero.clientHeight];
      if (n[0] === size[0] && Math.abs(n[1] - size[1]) < 2) return;
      size = n; setHeight();
      if (cur) build();
    }, 180);
  };
  addEventListener('resize', remeasure);
  new ResizeObserver(remeasure).observe(hero);   // also catches a scrollbar appearing, which fires no resize event


  setHeight();
  chips.forEach(o => o.setAttribute('aria-pressed', 'false'));
  sync();
})();

