// The client brand guideline page. Every example is rendered with the client's own tokens and components,
// so the guideline is a working demo of the kit. "Q_" is replaced with the client prefix at the end.
export default (x) => {
  const { cfg, p, themes, def, alt, core, pairs, type, fonts, fontUrl, radius, space, layout, motion, logo, svgUri, icons, icon, imgs, esc, labelFont } = x;
  const v = cfg.voice || {}, im = cfg.imagery || {}, idea = cfg.idea || {}, IP = x.imagePrompts;
  const [setup, payoff] = idea.headline || [`${cfg.name}.`, 'On brand.'];
  const T = themes[def], U = themes[alt];
  const L = themes.light, D = themes.dark;
  const logoOn = (theme) => svgUri(theme === 'dark' ? logo.onDark : logo.onLight);
  const mark = svgUri(logo.mark);
  const ctaP = v.ctaPrimary || 'Start', ctaS = v.ctaSecondary || 'See how it works';
  const famOf = (f) => ({ display: cfg.fonts.display.family, body: cfg.fonts.body.family, label: labelFont.family })[f];
  const sample = { display: `${setup} ${payoff}`, h2: payoff, h3: (idea.pillars?.[0]?.title) || payoff, h4: (idea.pillars?.[1]?.title) || 'Card title', stat: '10 min', lead: (idea.promise || '').split('. ')[0] + '.', 'body-lg': (v.write || [''])[0], body: (v.write || ['', ''])[1] || (v.write || [''])[0], small: v.names || cfg.name, label: 'Section label', micro: `${cfg.name} · ${cfg.version || ''}` };
  const photo = (i, label) => imgs[i] ? `<img src="${imgs[i].src}" alt="">` : `<div class="g-ph" aria-hidden="true"><span>${label}</span></div>`;

  const chapters = [
    ['idea', 'The idea'], ['logo', 'Logo'], ['colour', 'Colour'], ['type', 'Type'], ['icons', 'Iconography'], ['imagery', 'Imagery'],
    ['components', 'Components'], ['layout', 'Layout and space'], ['voice', 'Voice and copy'], ['social', 'Social kit'], ['apply', 'Applying it'], ['ai', 'Use with AI'], ['tokens', 'Tokens and files'],
  ];
  const head = (id, title, h2a, h2b, lead) => { const n = String(chapters.findIndex((c) => c[0] === id) + 1).padStart(2, '0'); return `<header><span class="Q_label">${n} · ${title}</span><h2 class="Q_h2">${h2a ? `<span class="Q_dim">${h2a}</span> ` : ''}${h2b}</h2>${lead ? `<p class="Q_lead">${lead}</p>` : ''}</header>`; };
  const dd = (doTitle, dos, dontTitle, donts) => `<div class="g-dd"><div class="g-do"><h4>${doTitle}</h4><ul>${dos.map((s) => `<li>${s}</li>`).join('')}</ul></div><div class="g-dont"><h4>${dontTitle}</h4><ul>${donts.map((s) => `<li>${s}</li>`).join('')}</ul></div></div>`;
  const swatch = (hex, name, sub, big) => `<figure class="g-sw${big ? ' big' : ''}"><div style="background:${hex}"></div><figcaption><b>${esc(name)}</b><span>${hex}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</figcaption></figure>`;
  const post = (theme, label, a, b, foot = '1 / 6', extra = '') => `<div class="g-post" data-theme="${theme}">${extra}<span class="Q_label">${label}</span><p class="ttl"><span>${a}</span> ${b}</p><div class="ft"><img src="${logoOn(theme)}" alt=""><span class="Q_micro">${foot}</span></div></div>`;

  let html = `<!doctype html>
<html lang="en" data-theme="${def}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(cfg.name)} Brand Guideline</title>
<meta name="description" content="${esc(cfg.name)} brand guideline ${esc(cfg.version || '')}: logo, colour, type, components, voice, social kit and AI pack.">
<link rel="icon" href="${mark}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontUrl}">
<style>
/* ===== tokens.css (generated) ===== */
${x.tokensCss}
/* ===== components.css (generated) ===== */
${x.componentsCss}
/* ===== guideline page only (g- prefix) ===== */
*, *::before, *::after { box-sizing: border-box; }
html, body { background: var(--Q_bg); }
body { margin: 0; }
.g-wrap { padding-inline: max(var(--Q_gutter), env(safe-area-inset-left, 0px)); }
@media (max-width: 600px) { .g-wrap { padding-inline: 16px; } }
.g-nav { position: sticky; top: 0; z-index: 30; background: var(--Q_bg); border-bottom: 1px solid var(--Q_hair); }
.g-nav .in { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: var(--Q_nav-h); max-width: var(--Q_frame); margin: 0 auto; }
.g-nav .logo img { height: 24px; width: auto; display: block; }
.g-nav .r { display: flex; align-items: center; gap: 14px; }
.g-grid { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 64px; max-width: 1320px; margin: 0 auto; }
.g-toc { position: sticky; top: calc(var(--Q_nav-h) + 32px); align-self: start; padding-top: 56px; display: grid; gap: 2px; }
.g-toc a { position: relative; display: grid; grid-template-columns: 28px 1fr; padding: 6px 0; font-size: 13.5px; color: var(--Q_text-muted); text-decoration: none; }
.g-toc a span { font-size: 11px; color: var(--Q_text-faint); padding-top: 2px; font-variant-numeric: tabular-nums; }
.g-toc a[aria-current="true"] { color: var(--Q_text); }
.g-toc a[aria-current="true"] span { color: var(--Q_accent-text); }
.g-toc a[aria-current="true"]::before { content: ""; position: absolute; left: -14px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%; background: var(--Q_accent); }
@media (max-width: 600px) { .g-nav .r .Q_micro { display: none; } }
@media (max-width: 1000px) { .g-grid { grid-template-columns: minmax(0, 1fr); gap: 0; } .g-toc { display: none; } }
.g-main { min-width: 0; }
.g-ch { padding-block: clamp(64px, 8vw, 112px); border-top: 1px solid var(--Q_hair); display: grid; gap: 28px; scroll-margin-top: var(--Q_nav-h); }
.g-ch > header { display: grid; gap: 16px; }
.g-ch h3 { margin: 22px 0 0; font-family: var(--Q_font-body); font-size: 19px; font-weight: 600; }
.g-p { margin: 0; max-width: 62ch; font-size: 16px; line-height: 1.6; color: var(--Q_text-muted); }
.g-p b { color: var(--Q_text); font-weight: 600; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .84em; padding: .1em .35em; border-radius: 4px; background: var(--Q_surface-2); color: var(--Q_text); }
.g-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 16px; }
.g-card { border-radius: var(--Q_radius-lg); background: var(--Q_surface); box-shadow: inset 0 0 0 1px var(--Q_hair); padding: 24px; display: grid; gap: 10px; align-content: start; min-width: 0; }
.g-card b { font-weight: 600; font-size: 16px; }
.g-card p { margin: 0; font-size: 14.5px; line-height: 1.55; color: var(--Q_text-muted); }
.g-stage { position: relative; border-radius: var(--Q_radius-lg); overflow: hidden; min-width: 0; display: flex; flex-direction: column; box-shadow: inset 0 0 0 1px var(--Q_hair); background: var(--Q_bg); }
.g-stage > :first-child { flex: 1; }
.g-cap { display: flex; justify-content: space-between; gap: 12px; padding: 11px 16px; border-top: 1px solid var(--Q_hair); font-size: 12px; color: var(--Q_text-faint); background: var(--Q_surface); position: relative; z-index: 1; }
.g-demo { padding: 32px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.g-dd { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 760px) { .g-dd { grid-template-columns: minmax(0, 1fr); } }
.g-dd > div { border-radius: var(--Q_radius-lg); padding: 22px 24px; box-shadow: inset 0 0 0 1px var(--Q_hair); display: grid; gap: 12px; align-content: start; }
.g-dd h4 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.g-dd h4::before { content: ""; width: 8px; height: 8px; border-radius: 50%; }
.g-do h4::before { background: var(--Q_success); } .g-dont h4::before { background: var(--Q_danger); border-radius: 1px; }
.g-dd ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.g-dd li { font-size: 14.5px; line-height: 1.5; color: var(--Q_text-muted); padding-left: 16px; position: relative; }
.g-dd li::before { content: ""; position: absolute; left: 0; top: .65em; width: 7px; height: 1px; background: var(--Q_text-faint); }
.g-table-wrap { overflow-x: auto; border-radius: var(--Q_radius-lg); box-shadow: inset 0 0 0 1px var(--Q_hair); }
.g-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 560px; }
.g-table th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--Q_text-faint); padding: 12px 16px; border-bottom: 1px solid var(--Q_hair); }
.g-table td { padding: 12px 16px; border-bottom: 1px solid var(--Q_hair); color: var(--Q_text-muted); vertical-align: top; }
.g-table tr:last-child td { border-bottom: 0; }
.g-table td:first-child { color: var(--Q_text); }
.g-table .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.g-pass { color: var(--Q_success); } .g-note { color: var(--Q_text-faint); }

/* cover */
.g-cover { border-bottom: 1px solid var(--Q_hair); overflow: hidden; position: relative; }
.g-cover .in { max-width: var(--Q_frame); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 56px; align-items: center; padding-block: clamp(56px, 8vw, 112px); }
.g-cover h1 { margin: 22px 0 0; font-family: var(--Q_font-display); font-weight: var(--Q_type-display-w); font-size: clamp(48px, 7.4vw, 124px); line-height: .98; letter-spacing: var(--Q_type-display-ls); text-wrap: balance; }
.g-cover h1 span { color: var(--Q_text-faint); display: block; }
.g-cover .Q_lead { margin-top: 26px; max-width: 44ch; }
.g-cover .acts { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
.g-cover .acts a { text-decoration: none; }
.g-cover .art { position: relative; aspect-ratio: 1; max-width: 460px; justify-self: end; width: 100%; }
.g-cover .art .g-post { position: absolute; width: 64%; right: 4%; top: 6%; transform: rotate(4deg); box-shadow: 0 40px 80px -30px rgba(0,0,0,.45); border-radius: var(--Q_radius-md); }
.g-cover .art .tile { position: absolute; left: 4%; bottom: 8%; width: 34%; aspect-ratio: 1; border-radius: 22%; transform: rotate(-7deg); box-shadow: 0 30px 60px -20px rgba(0,0,0,.45); }
.g-cover .art .chip { position: absolute; left: 10%; top: 14%; display: flex; gap: 8px; padding: 10px 12px; border-radius: 999px; background: var(--Q_surface); box-shadow: inset 0 0 0 1px var(--Q_hair), 0 20px 40px -20px rgba(0,0,0,.3); transform: rotate(-4deg); }
.g-cover .art .chip i { width: 22px; height: 22px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--Q_hair); }
.g-cover .foot { max-width: var(--Q_frame); margin: 0 auto; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 18px 0 22px; border-top: 1px solid var(--Q_hair); }
@media (max-width: 900px) { .g-cover .in { grid-template-columns: minmax(0, 1fr); } .g-cover .art { max-width: 340px; justify-self: start; } }

/* idea */
.g-pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 16px; }
.g-pillars .g-card span { font-variant-numeric: tabular-nums; color: var(--Q_accent-text); font-weight: 600; }
.g-quote { margin: 0; font-family: var(--Q_font-display); font-size: clamp(24px, 2.6vw, 34px); line-height: 1.25; letter-spacing: var(--Q_type-h3-ls); max-width: 30ch; }

/* logo */
.g-logos { display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 16px; }
@media (max-width: 900px) { .g-logos { grid-template-columns: minmax(0, 1fr); } }
.g-logo-tile { min-height: 220px; display: grid; place-items: center; padding: 36px; }
.g-logo-tile img { max-width: 70%; max-height: 64px; }
.g-logo-tile .mk { width: 96px; height: 96px; border-radius: 22%; max-height: none; }
.g-clear { position: relative; display: inline-block; padding: 34px; outline: 1px dashed var(--Q_border); }
.g-misuse { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 12px; }
.g-misuse figure { margin: 0; border-radius: var(--Q_radius-md); box-shadow: inset 0 0 0 1px var(--Q_hair); overflow: hidden; }
.g-misuse div { height: 110px; display: grid; place-items: center; background: var(--Q_surface); position: relative; }
.g-misuse div::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top right, transparent calc(50% - 1px), var(--Q_danger) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)); opacity: .7; }
.g-misuse img { max-width: 60%; max-height: 34px; }
.g-misuse figcaption { padding: 10px 12px; font-size: 12.5px; color: var(--Q_text-muted); }

/* colour */
.g-sws { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); gap: 12px; }
.g-sw { margin: 0; border-radius: var(--Q_radius-md); overflow: hidden; box-shadow: inset 0 0 0 1px var(--Q_hair); background: var(--Q_surface); }
.g-sw div { height: 96px; box-shadow: inset 0 0 0 1px var(--Q_hair); }
.g-sw.big div { height: 150px; }
.g-sw figcaption { padding: 12px 14px; display: grid; gap: 3px; font-size: 13px; }
.g-sw span { font-variant-numeric: tabular-nums; color: var(--Q_text-muted); }
.g-sw small { color: var(--Q_text-faint); font-size: 12px; line-height: 1.4; }
.g-ratio { display: flex; height: 18px; border-radius: 999px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--Q_hair); }
.g-pair { display: inline-block; padding: 3px 9px; border-radius: 6px; font-weight: 600; font-size: 13px; }

/* type */
.g-type { display: grid; }
.g-type > div { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 24px; padding: 22px 0; border-bottom: 1px solid var(--Q_hair); align-items: baseline; }
.g-type .meta { font-size: 12px; color: var(--Q_text-faint); line-height: 1.5; }
.g-type .meta b { display: block; color: var(--Q_text); font-size: 13px; }
.g-type .s { min-width: 0; overflow-wrap: anywhere; }
@media (max-width: 640px) { .g-type > div { grid-template-columns: minmax(0, 1fr); gap: 8px; } }
.g-faces { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 16px; }
.g-face { padding: 28px; display: grid; gap: 10px; }
.g-face .aa { font-size: 88px; line-height: 1; }

/* icons */
.g-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.g-icons figure { margin: 0; padding: 18px 8px 12px; border-radius: var(--Q_radius-md); background: var(--Q_surface); box-shadow: inset 0 0 0 1px var(--Q_hair); display: grid; justify-items: center; gap: 10px; }
.g-icons svg { width: 24px; height: 24px; }
.g-icons figcaption { font-size: 11px; color: var(--Q_text-faint); }

/* imagery */
.g-photos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
@media (max-width: 760px) { .g-photos { grid-template-columns: minmax(0, 1fr); } }
.g-photos figure { margin: 0; border-radius: var(--Q_radius-md); overflow: hidden; box-shadow: inset 0 0 0 1px var(--Q_hair); }
.g-photos img, .g-ph { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
.g-ph { display: grid; place-items: end start; padding: 16px; background: radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, var(--Q_c-accent) 22%, var(--Q_surface-2)), var(--Q_surface-2) 70%); }
.g-ph span { font-size: 12px; color: var(--Q_text-muted); }
.g-photos figcaption { padding: 10px 14px; font-size: 12.5px; color: var(--Q_text-muted); background: var(--Q_surface); }

/* prompt library */
.g-pl-base { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 16px; }
@media (max-width: 860px) { .g-pl-base { grid-template-columns: minmax(0, 1fr); } }
.g-pl { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr)); gap: 16px; }
.g-pl-card { border-radius: var(--Q_radius-lg); overflow: hidden; background: var(--Q_surface); box-shadow: inset 0 0 0 1px var(--Q_hair); display: flex; flex-direction: column; min-width: 0; }
.g-pl-card > img, .g-pl-card > .g-ph { display: block; width: 100%; height: 140px; aspect-ratio: auto; object-fit: cover; }
.g-pl-card .b { padding: 16px 18px 18px; display: grid; gap: 10px; flex: 1; align-content: start; }
.g-pl-card .t { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.g-pl-card .t b { font-weight: 600; font-size: 15.5px; }
.g-pl-card .u { margin: 0; font-size: 13px; color: var(--Q_text-faint); }
.g-pl-card pre { margin: 0; max-height: 132px; overflow: auto; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; line-height: 1.6; color: var(--Q_text-muted); padding: 10px 12px; border-radius: 8px; background: var(--Q_surface-2); }
.g-pl-card .a { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; }

/* components */
.g-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
@media (max-width: 860px) { .g-two { grid-template-columns: minmax(0, 1fr); } }
.g-form { padding: 32px; display: grid; gap: 14px; }

/* layout */
.g-space { display: grid; gap: 8px; }
.g-space div { display: grid; grid-template-columns: 80px 60px 1fr; gap: 12px; align-items: center; font-size: 13px; color: var(--Q_text-muted); }
.g-space i { height: 10px; background: var(--Q_accent); border-radius: 2px; }
.g-radii { display: flex; flex-wrap: wrap; gap: 16px; }
.g-radii figure { margin: 0; display: grid; gap: 8px; justify-items: center; font-size: 12px; color: var(--Q_text-faint); }
.g-radii div { width: 76px; height: 76px; background: var(--Q_surface); box-shadow: inset 0 0 0 1.5px var(--Q_border); }

/* social */
.g-post { aspect-ratio: 4 / 5; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 8%; background: var(--Q_bg); color: var(--Q_text); container-type: inline-size; }
.g-post .ttl { margin: 0; font-family: var(--Q_font-display); font-weight: var(--Q_type-h2-w); font-size: 9.6cqi; line-height: 1.04; letter-spacing: var(--Q_type-h2-ls); text-wrap: balance; position: relative; }
.g-post .ttl span { color: var(--Q_text-faint); }
.g-post .ft { display: flex; justify-content: space-between; align-items: center; position: relative; }
.g-post .ft img { height: 5.4cqi; width: auto; }
.g-post .Q_label, .g-post .Q_micro { font-size: 3.4cqi; position: relative; }
.g-post.photo > img, .g-post.photo > .g-ph { position: absolute; inset: 0; width: 100%; height: 100%; aspect-ratio: auto; }
.g-post.photo::before { content: ""; position: absolute; inset: 0; z-index: 0; background: linear-gradient(180deg, transparent 30%, color-mix(in srgb, var(--Q_c-dark) 85%, transparent)); }
.g-posts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: start; }
@media (max-width: 1100px) { .g-posts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.g-social-row { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 900px) { .g-social-row { grid-template-columns: minmax(0, 1fr); } }
.g-banner { aspect-ratio: 1584 / 396; position: relative; display: flex; align-items: center; padding: 0 6% 0 30%; background: var(--Q_bg); container-type: inline-size; }
.g-banner .ttl { margin: 0; font-family: var(--Q_font-display); font-size: 4.6cqi; line-height: 1.05; letter-spacing: var(--Q_type-h2-ls); }
.g-banner .ttl span { color: var(--Q_text-faint); }
.g-banner .safe { position: absolute; left: 0; top: 0; bottom: 0; width: 26%; border-right: 1px dashed var(--Q_border); display: flex; align-items: end; padding: 1.4cqi; font-size: 1.1cqi; color: var(--Q_text-faint); text-transform: uppercase; letter-spacing: .08em; }
.g-story-wrap { display: flex; gap: 14px; justify-content: center; padding: 22px; flex-wrap: wrap; background: var(--Q_surface); }
.g-story { width: 200px; aspect-ratio: 9 / 16; border-radius: 14px; position: relative; overflow: hidden; background: var(--Q_bg); color: var(--Q_text); container-type: inline-size; display: flex; flex-direction: column; justify-content: center; gap: 6cqi; padding: 16% 18px 26%; box-shadow: inset 0 0 0 1px var(--Q_hair); }
.g-story .ttl { margin: 0; font-family: var(--Q_font-display); font-size: 11cqi; line-height: 1.05; }
.g-story .ttl span { color: var(--Q_text-faint); display: block; }
.g-story .Q_label { font-size: 5cqi; }
.g-story .zone { position: absolute; left: 0; right: 0; display: flex; align-items: center; justify-content: center; font-size: 4.4cqi; letter-spacing: .06em; text-transform: uppercase; color: var(--Q_danger); background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--Q_danger) 14%, transparent) 0 4px, transparent 4px 9px); }
.g-story .zone.t { top: 0; height: 13%; border-bottom: 1px dashed var(--Q_danger); } .g-story .zone.b { bottom: 0; height: 18%; border-top: 1px dashed var(--Q_danger); }
.g-story .pill { align-self: start; display: inline-flex; align-items: center; height: 12cqi; padding: 0 6cqi; border-radius: var(--Q_radius-btn); background: var(--Q_accent); color: var(--Q_on-accent); font-size: 5.4cqi; font-weight: 600; }
.g-avatars { display: flex; gap: 18px; align-items: center; justify-content: center; padding: 28px; flex-wrap: wrap; background: var(--Q_surface); }
.g-avatars img { width: 76px; height: 76px; } .g-avatars .c { border-radius: 50%; } .g-avatars .s { width: 38px; height: 38px; border-radius: 50%; }

/* apply */
.g-og { aspect-ratio: 1200 / 630; display: grid; grid-template-columns: 1.4fr 1fr; gap: 6%; align-items: center; padding: 0 7%; background: var(--Q_bg); container-type: inline-size; }
.g-og .ttl { margin: 0; font-family: var(--Q_font-display); font-size: 5.6cqi; line-height: 1.04; letter-spacing: var(--Q_type-h2-ls); }
.g-og .ttl span { color: var(--Q_text-faint); }
.g-og .side { display: grid; gap: 2.4cqi; justify-items: start; }
.g-og .side img { height: 3.4cqi; }
.g-og .side .pill { display: inline-flex; align-items: center; height: 5.4cqi; padding: 0 2.6cqi; border-radius: var(--Q_radius-btn); background: var(--Q_accent); color: var(--Q_on-accent); font-size: 2.2cqi; font-weight: 600; }
.g-doc { padding: 34px; display: grid; gap: 14px; background: var(--Q_bg); font-size: 13.5px; }
.g-doc .top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid var(--Q_hair); }
.g-doc .top img { height: 20px; }
.g-doc h5 { margin: 0; font-family: var(--Q_font-display); font-size: 26px; font-weight: var(--Q_type-h3-w); line-height: 1.1; }
.g-doc table { border-collapse: collapse; width: 100%; } .g-doc td { padding: 8px 0; border-bottom: 1px solid var(--Q_hair); color: var(--Q_text-muted); } .g-doc td:last-child { text-align: right; color: var(--Q_text); }
.g-slide { aspect-ratio: 16 / 9; display: flex; flex-direction: column; justify-content: space-between; padding: 6%; background: var(--Q_bg); container-type: inline-size; }
.g-slide .ttl { margin: 0; font-family: var(--Q_font-display); font-size: 6.2cqi; line-height: 1.04; letter-spacing: var(--Q_type-h2-ls); max-width: 16ch; }
.g-slide .ttl span { color: var(--Q_text-faint); }
.g-slide .Q_label, .g-slide .Q_micro { font-size: 1.9cqi; }
.g-slide .ft { display: flex; justify-content: space-between; align-items: center; } .g-slide .ft img { height: 2.8cqi; }

/* ai */
.g-prompt { border-radius: var(--Q_radius-lg); box-shadow: inset 0 0 0 1px var(--Q_hair); background: var(--Q_surface); overflow: hidden; }
.g-prompt .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 12px 10px 18px; border-bottom: 1px solid var(--Q_hair); flex-wrap: wrap; }
.g-prompt .bar div { display: flex; gap: 8px; flex-wrap: wrap; }
.g-prompt pre { margin: 0; padding: 18px; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 1.7; color: var(--Q_text-muted); }
.g-foot { padding: 40px 0 56px; border-top: 1px solid var(--Q_hair); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
</style>
</head>
<body class="Q_ROOT">
<nav class="g-nav g-wrap"><div class="in">
  <a class="logo" href="#top"><img src="${logoOn(def)}" alt="${esc(cfg.name)}" data-logo-light="${logoOn('light')}" data-logo-dark="${logoOn('dark')}"></a>
  <div class="r"><span class="Q_micro">Brand guideline · ${esc(cfg.version || '')}</span><button class="Q_btn is-ghost is-sm" type="button" id="g-theme">${alt === 'dark' ? 'Dark' : 'Light'} theme</button></div>
</div></nav>

<header class="g-cover g-wrap" id="top">
  <div class="in">
    <div>
      <span class="Q_label">${esc(cfg.name)} brand guideline</span>
      <h1><span>${setup}</span>${payoff}</h1>
      <p class="Q_lead">How ${esc(cfg.name)} looks, sounds and builds: logo, colour, type, components, voice, a social kit and an AI pack, all from one set of tokens.</p>
      <div class="acts"><a class="Q_btn is-primary" href="#idea">Read the guideline ${icon('arrow-down')}</a><a class="Q_btn is-ghost" href="#ai">Use it with AI</a></div>
    </div>
    <div class="art" aria-hidden="true">
      ${post(alt, cfg.name, setup, payoff, '1 / 6')}
      <img class="tile" src="${mark}" alt="">
      <div class="chip">${core.slice(0, 5).map((c) => `<i style="background:${c.hex}"></i>`).join('')}</div>
    </div>
  </div>
  <div class="foot"><span class="Q_micro">${esc(cfg.fonts.display.family)} · ${esc(cfg.fonts.body.family)}</span><span class="Q_micro">${esc(cfg.legalName || cfg.name)}${cfg.url ? ' · ' + esc(cfg.url) : ''}</span></div>
</header>

<div class="g-wrap"><div class="g-grid">
<aside class="g-toc" aria-label="Contents">
${chapters.map(([id, t], i) => `  <a href="#${id}"><span>${String(i + 1).padStart(2, '0')}</span>${t}</a>`).join('\n')}
</aside>
<main class="g-main">

<section class="g-ch" id="idea">
  ${head('idea', 'The idea', '', esc(cfg.name) + ' in one breath.', '')}
  <p class="g-quote">${esc(idea.promise || '')}</p>
  <div class="g-pillars">${(idea.pillars || []).map((q, i) => `<div class="g-card"><span>${String(i + 1).padStart(2, '0')}</span><b>${esc(q.title)}</b><p>${esc(q.body)}</p></div>`).join('')}</div>
  <p class="g-p"><b>Personality:</b> ${esc(idea.personality || '')}</p>
</section>

<section class="g-ch" id="logo">
  ${head('logo', 'Logo', 'One mark,', 'used the same way everywhere.', `The logo comes in a version for light backgrounds, one for dark, and a square mark for avatars, app icons and favicons.${logo.isText ? ` Until a custom logo is drawn, the wordmark is “${esc(cfg.logo?.wordmark?.text || cfg.name)}” set in ${esc(cfg.fonts.display.family)}.` : ''}`)}
  <div class="g-logos">
    <div class="g-stage" data-theme="light" style="background:var(--Q_bg)"><div class="g-logo-tile"><img src="${logoOn('light')}" alt="${esc(cfg.name)} logo on light"></div><div class="g-cap"><span>On light</span><span>logo-on-light.svg</span></div></div>
    <div class="g-stage" data-theme="dark" style="background:var(--Q_bg)"><div class="g-logo-tile"><img src="${logoOn('dark')}" alt="${esc(cfg.name)} logo on dark"></div><div class="g-cap"><span>On dark</span><span>logo-on-dark.svg</span></div></div>
    <div class="g-stage"><div class="g-logo-tile"><img class="mk" src="${mark}" alt="${esc(cfg.name)} mark"></div><div class="g-cap"><span>Mark · avatar, favicon</span><span>logo-mark.svg</span></div></div>
  </div>
  <div class="g-stage"><div class="g-demo" style="justify-content:center"><div class="g-clear"><img src="${logoOn(def)}" alt="" style="height:48px;display:block"></div></div><div class="g-cap"><span>Clear space = the height of the first letter on every side</span><span>Min width 72px</span></div></div>
  <div class="g-misuse">
    <figure><div><img src="${logoOn(def)}" alt="" style="filter:hue-rotate(140deg) saturate(3)"></div><figcaption>Don’t recolour it</figcaption></figure>
    <figure><div><img src="${logoOn(def)}" alt="" style="transform:scaleX(1.5)"></div><figcaption>Don’t stretch it</figcaption></figure>
    <figure><div><img src="${logoOn(def)}" alt="" style="filter:drop-shadow(0 0 8px ${T.accent})"></div><figcaption>No glows or shadows</figcaption></figure>
    <figure><div><img src="${logoOn(def)}" alt="" style="transform:rotate(-12deg)"></div><figcaption>Don’t rotate it</figcaption></figure>
  </div>
</section>

<section class="g-ch" id="colour">
  ${head('colour', 'Colour', `${esc(cfg.colors.light.name)}, ${esc(cfg.colors.dark.name)},`, `and one ${esc(cfg.colors.accent.name)}.`, `The ${def} theme is the default. The ${alt} theme uses the same roles, so any component works in both. Every text colour below is checked for contrast.`)}
  <div class="g-sws">${core.slice(0, 5).map((c, i) => swatch(c.hex, c.name, c.use, i === 4)).join('')}</div>
  ${(cfg.colors.support || []).length ? `<h3>Support colours</h3><div class="g-sws">${core.slice(5).map((c) => swatch(c.hex, c.name, c.use)).join('')}</div>` : ''}
  <h3>Proportion</h3>
  <div class="g-ratio"><i style="flex:62;background:${T.bg}"></i><i style="flex:22;background:${U.bg}"></i><i style="flex:11;background:${T.text}"></i><i style="flex:5;background:${T.accent}"></i></div>
  <p class="g-p">Roughly 60% ${def} background, 20% ${alt} sections, 10% text, 5% accent. The accent is a signal, not a mood.</p>
  <h3>Theme roles</h3>
  <div class="g-table-wrap"><table class="g-table"><thead><tr><th>Role</th><th>Light</th><th>Dark</th></tr></thead><tbody>
  ${Object.keys(L).map((k) => `<tr><td><code>--Q_${k}</code></td><td class="num"><span class="g-pair" style="background:${L[k]};box-shadow:inset 0 0 0 1px rgba(127,127,127,.3)">&nbsp;&nbsp;</span> ${L[k]}</td><td class="num"><span class="g-pair" style="background:${D[k]};box-shadow:inset 0 0 0 1px rgba(127,127,127,.3)">&nbsp;&nbsp;</span> ${D[k]}</td></tr>`).join('')}
  </tbody></table></div>
  <h3>Contrast, checked</h3>
  <div class="g-table-wrap"><table class="g-table"><thead><tr><th>Pair</th><th>Sample</th><th>Ratio</th><th>Use</th></tr></thead><tbody>
  ${pairs.map((q) => `<tr><td>${esc(q.name)}</td><td><span class="g-pair" style="background:${q.bg};color:${q.fg}">Aa 14</span></td><td class="num ${q.ok ? 'g-pass' : 'g-note'}">${q.r.toFixed(2)}:1 ${q.ok ? 'AA' : ''}</td><td>${esc(q.use)}</td></tr>`).join('')}
  </tbody></table></div>
</section>

<section class="g-ch" id="type">
  ${head('type', 'Type', `${esc(cfg.fonts.display.family)} speaks,`, `${esc(cfg.fonts.body.family)} works.`, `Headlines in ${esc(cfg.fonts.display.family)}, everything else in ${esc(cfg.fonts.body.family)}. Labels are UPPERCASE ${labelFont.family === cfg.fonts.body.family ? esc(labelFont.family) : esc(labelFont.family)} with wide tracking.`)}
  <div class="g-faces">
    <div class="g-card g-face"><span class="Q_label is-quiet">Display</span><span class="aa" style="font-family:var(--Q_font-display)">Aa</span><b>${esc(cfg.fonts.display.family)}</b><p>Weights ${(cfg.fonts.display.weights || []).join(', ')}${cfg.fonts.display.italic ? ', italic' : ''}. Headlines, big numbers, quotes.</p></div>
    <div class="g-card g-face"><span class="Q_label is-quiet">Body</span><span class="aa" style="font-family:var(--Q_font-body)">Aa</span><b>${esc(cfg.fonts.body.family)}</b><p>Weights ${(cfg.fonts.body.weights || []).join(', ')}. Paragraphs, buttons, UI, captions.</p></div>
  </div>
  <div class="g-type">
  ${Object.entries(type).map(([k, [s, w, lh, ls, f, d]]) => `<div><div class="meta"><b>${k}</b>${esc(famOf(f))} ${w}<br>${esc(s)}<br>${lh} / ${ls}</div><div class="s ${['label', 'micro'].includes(k) ? 'Q_' + k : ['display', 'h2', 'h3', 'h4', 'stat', 'lead', 'small'].includes(k) ? 'Q_' + k : ''}" style="${['body', 'body-lg'].includes(k) ? `font-size:var(--Q_type-${k});line-height:var(--Q_type-${k}-lh)` : ''}">${esc(sample[k] || '')}</div></div>`).join('\n  ')}
  </div>
</section>

<section class="g-ch" id="icons">
  ${head('icons', 'Iconography', 'Thin lines,', 'round ends.', `${Object.keys(icons).length} icons on a 16px grid with a 1.6px stroke, drawn in the current text colour. Use them at 16, 20 or 24px. Accent-coloured only when they mark the one action.`)}
  <div class="g-icons">${Object.keys(icons).map((k) => `<figure>${icon(k)}<figcaption>${k}</figcaption></figure>`).join('')}</div>
</section>

<section class="g-ch" id="imagery">
  ${head('imagery', 'Imagery', esc(im.headline?.[0] || 'Real things,'), esc(im.headline?.[1] || 'real light.'), esc(im.summary || ''))}
  <div class="g-photos">
    <figure>${photo(0, 'Hero photo · 4:5')}<figcaption>${esc((im.do || [])[0] || '')}</figcaption></figure>
    <figure>${photo(1, 'Detail · hands, objects')}<figcaption>${esc((im.do || [])[1] || '')}</figcaption></figure>
    <figure>${photo(2, 'Texture · place')}<figcaption>${esc((im.do || [])[2] || '')}</figcaption></figure>
  </div>
  ${dd('Do', (im.do || []).map(esc), 'Don’t', (im.dont || []).map(esc))}
  <h3>Prompt library</h3>
  <p class="g-p">Copy-ready prompts for ChatGPT, Gemini, Midjourney, Firefly and other image tools. Every prompt is one subject plus the same brand style and avoid list, so images made by different people with different tools still look like one brand.</p>
  <div class="g-pl-base">
    <div class="g-prompt"><div class="bar"><span class="Q_label">Brand style · add to every prompt</span><div><button class="Q_btn is-ghost is-sm" type="button" data-copy="pl-style">Copy</button></div></div><pre id="pl-style">${esc(IP.style)}</pre></div>
    <div class="g-prompt"><div class="bar"><span class="Q_label">Always avoid</span><div><button class="Q_btn is-ghost is-sm" type="button" data-copy="pl-avoid">Copy</button></div></div><pre id="pl-avoid">${esc(IP.avoid)}</pre></div>
  </div>
  <div class="g-pl">${IP.prompts.map((q, i) => `<article class="g-pl-card">${imgs[i] ? `<img src="${imgs[i].src}" alt="">` : '<div class="g-ph"></div>'}<div class="b"><div class="t"><b>${esc(q.title)}</b><span class="Q_micro">${esc(q.ar)}</span></div><p class="u">${esc(q.use || '')}</p><pre id="pl-${q.id}">${esc(IP.full(q))}</pre><pre hidden id="pl-${q.id}-mj">${esc(IP.mj(q))}</pre><div class="a"><button class="Q_btn is-ghost is-sm" type="button" data-copy="pl-${q.id}">Copy prompt</button><button class="Q_btn is-ghost is-sm" type="button" data-copy="pl-${q.id}-mj">Midjourney</button></div></div></article>`).join('')}</div>
  <div class="g-card"><span class="Q_label is-quiet">Write your own</span><p><b>[Subject: who or what, doing what, where]</b> + the brand style + <b>Aspect ratio [4:5 · 1:1 · 16:9 · 9:16]</b> + “Avoid: …”. Describe a real scene a photographer could shoot. Name the light, not the mood.</p></div>
  <div class="g-table-wrap"><table class="g-table"><thead><tr><th>Tool</th><th>How</th></tr></thead><tbody>
    <tr><td>ChatGPT, Gemini, Copilot</td><td>Paste the full prompt as it is.</td></tr>
    <tr><td>Midjourney</td><td>Use the Midjourney button: it adds <code>--ar</code>, <code>--style raw --stylize 50</code> and the <code>--no</code> list. Add a reference image with <code>--sref</code> to lock the look.</td></tr>
    <tr><td>Adobe Firefly, Ideogram, Flux</td><td>Content type Photo, effects off, avoid list in the negative prompt.</td></tr>
    <tr><td>Any tool</td><td>Generate four, keep one. Never ask for words inside the image.</td></tr>
  </tbody></table></div>
  ${dd('After you generate', IP.after.map(esc), 'Where generated images can’t go', IP.rules.map(esc))}
</section>

<section class="g-ch" id="components">
  ${head('components', 'Components', 'Built once,', 'used on every page.', `Everything here is live HTML using <code>components.css</code>. Wrap a page in <code>class="Q_ROOT"</code> and these classes work in both themes.`)}
  <div class="g-two">
    <div class="g-stage" data-theme="${def}"><div class="g-demo"><a class="Q_btn is-primary" href="#components">${esc(ctaP)} ${icon('arrow-right')}</a><a class="Q_btn is-ghost" href="#components">${esc(ctaS)}</a><a class="Q_btn is-solid is-sm" href="#components">${esc(ctaP)}</a><button class="Q_btn" type="button" disabled>Disabled</button><a class="Q_link" href="#components">An inline link</a></div><div class="g-cap"><span>.Q_btn · is-primary · is-ghost · is-solid · is-sm</span><span>${def}</span></div></div>
    <div class="g-stage" data-theme="${alt}"><div class="g-demo"><a class="Q_btn is-primary" href="#components">${esc(ctaP)} ${icon('arrow-right')}</a><a class="Q_btn is-ghost" href="#components">${esc(ctaS)}</a><a class="Q_btn is-solid is-sm" href="#components">${esc(ctaP)}</a><a class="Q_link" href="#components">An inline link</a></div><div class="g-cap"><span>Same classes inside data-theme="${alt}"</span><span>${alt}</span></div></div>
  </div>
  <div class="g-two">
    <div class="g-stage"><div class="g-demo" style="display:grid;gap:16px;justify-items:start"><span class="Q_label">Section label</span><span class="Q_label is-quiet">Quiet label</span><h3 class="Q_h3"><span class="Q_dim">${setup}</span> ${payoff}</h3><span class="Q_micro">Micro · tags and table heads</span></div><div class="g-cap"><span>.Q_label · .Q_dim · .Q_micro</span><span>type</span></div></div>
    <div class="g-stage"><div class="g-form"><input class="Q_input" placeholder="you@company.com" aria-label="Email"><input class="Q_input" value="not-an-email" aria-invalid="true" aria-label="Email, invalid"><span class="Q_error">Check the email address.</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="Q_chip" aria-pressed="true" type="button">All</button><button class="Q_chip" type="button">${esc((v.use || ['One'])[0])}</button><button class="Q_chip" type="button">${esc((v.use || ['', 'Two'])[1] || 'Two')}</button></div></div><div class="g-cap"><span>.Q_input · .Q_error · .Q_chip</span><span>forms</span></div></div>
  </div>
  <div class="g-stage"><div class="g-demo" style="display:block"><div class="Q_window"><div class="Q_window-bar"><i></i><i></i><i></i></div><div style="padding:28px;display:grid;gap:12px"><span class="Q_label">${esc(cfg.name)}</span><h4 class="Q_h4">Show real screens inside a window frame.</h4><p class="Q_small" style="margin:0">Screenshots, product shots and client work go in <code>.Q_window</code>. A panel (<code>.Q_panel</code>) holds grouped content.</p></div></div></div><div class="g-cap"><span>.Q_window · .Q_panel</span><span>surfaces</span></div></div>
</section>

<section class="g-ch" id="layout">
  ${head('layout', 'Layout and space', 'Wide frame,', 'narrow content.', `The nav runs to a ${layout.frame[0]} frame; section content stops at ${layout.content[0]}. Spacing is a 4px scale.`)}
  <div class="g-two">
    <div class="g-card"><span class="Q_label is-quiet">Space</span><div class="g-space">${Object.entries(space).map(([k, val]) => `<div><span>space-${k}</span><span>${val}</span><i style="width:${val}"></i></div>`).join('')}</div></div>
    <div class="g-card"><span class="Q_label is-quiet">Radius · buttons ${radius.btn}</span><div class="g-radii">${Object.entries(radius).map(([k, val]) => `<figure><div style="border-radius:${val === '999px' ? '38px' : val}"></div><figcaption>${k} · ${val}</figcaption></figure>`).join('')}</div></div>
  </div>
  <div class="g-table-wrap"><table class="g-table"><thead><tr><th>Token</th><th>Value</th><th>Use</th></tr></thead><tbody>${[...Object.entries(layout), ...Object.entries(motion)].map(([k, [val, d]]) => `<tr><td><code>--Q_${k}</code></td><td class="num">${esc(val)}</td><td>${esc(d)}</td></tr>`).join('')}</tbody></table></div>
</section>

<section class="g-ch" id="voice">
  ${head('voice', 'Voice and copy', esc(v.headline?.[0] || 'Say it plainly.'), esc(v.headline?.[1] || 'Then stop.'), esc(v.summary || ''))}
  <div class="g-cols">
    <div class="g-card"><span class="Q_label is-quiet">Words we use</span><b>${(v.use || []).map(esc).join(' · ')}</b></div>
    <div class="g-card"><span class="Q_label is-quiet">Words we avoid</span><p>${(v.avoid || []).map(esc).join(', ')}, and emoji in headlines.</p></div>
    <div class="g-card"><span class="Q_label is-quiet">Buttons</span><b>Say what happens.</b><p>“${esc(ctaP)}”, “${esc(ctaS)}”. Never “Click here” or “Learn more”.</p></div>
    <div class="g-card"><span class="Q_label is-quiet">Names</span><p>${esc(v.names || cfg.name)}</p></div>
  </div>
  ${dd('Write', (v.write || []).map((s) => `“${esc(s)}”`), 'Not', (v.not || []).map((s) => `“${esc(s)}”`))}
</section>

<section class="g-ch" id="social">
  ${head('social', 'Social kit', 'Same voice,', 'every feed.', 'Posts, carousels, stories, profiles and their sizes. Mix both themes in the feed; the accent stays small.')}
  <div class="g-posts">
    <div class="g-stage">${post(def, 'Tip', setup, payoff, '1 / 6')}<div class="g-cap"><span>Feed · ${def}</span><span>1080×1350</span></div></div>
    <div class="g-stage">${post(alt, 'Carousel', (v.write || [''])[0], '', 'Swipe →')}<div class="g-cap"><span>Carousel cover · ${alt}</span><span>1080×1350</span></div></div>
    <div class="g-stage"><div class="g-post photo" data-theme="dark">${imgs[0] ? `<img src="${imgs[0].src}" alt="">` : '<div class="g-ph"></div>'}<span class="Q_label">Story</span><p class="ttl">${esc((v.write || ['', ''])[1] || payoff)}</p><div class="ft"><img src="${logoOn('dark')}" alt=""><span class="Q_micro">3 / 6</span></div></div><div class="g-cap"><span>Photo + gradient</span><span>1080×1350</span></div></div>
    <div class="g-stage">${post(def, 'Number', '10 min', 'a day.', '4 / 6')}<div class="g-cap"><span>Stat post</span><span>1080×1350</span></div></div>
  </div>
  <div class="g-social-row">
    <div class="g-stage"><div class="g-banner" data-theme="${alt}"><span class="safe">Avatar covers this</span><p class="ttl"><span>${setup}</span> ${payoff}</p></div><div class="g-cap"><span>Banner · text right of the avatar</span><span>LinkedIn 1584×396 · X 1500×500</span></div></div>
    <div class="g-stage"><div class="g-avatars"><img class="c" src="${mark}" alt=""><img src="${mark}" alt="" style="border-radius:18px"><img class="s" src="${mark}" alt=""></div><div class="g-cap"><span>Avatar · logo-mark.svg</span><span>800×800</span></div></div>
  </div>
  <div class="g-stage"><div class="g-story-wrap">
    <div class="g-story" data-theme="${alt}"><span class="zone t">Keep clear</span><span class="Q_label">New</span><p class="ttl"><span>${setup}</span>${payoff}</p><span class="pill">${esc(ctaP)}</span><span class="zone b">Keep clear</span></div>
    <div class="g-story" data-theme="${def}"><span class="zone t">Keep clear</span><span class="Q_label">Poll</span><p class="ttl"><span>Which would</span>you pick?</p><span class="pill">A or B</span><span class="zone b">Keep clear</span></div>
  </div><div class="g-cap"><span>Story · keep the top 250px and bottom 340px clear</span><span>1080×1920</span></div></div>
  <div class="g-table-wrap"><table class="g-table"><thead><tr><th>Asset</th><th>Size</th><th>Notes</th></tr></thead><tbody>
    <tr><td>Feed post, carousel slide</td><td class="num">1080×1350</td><td>Label top left, logo bottom left, 86px margin. One idea per post; carousels run cover, point, list, proof, call to action.</td></tr>
    <tr><td>Square post</td><td class="num">1080×1080</td><td>X and Facebook.</td></tr>
    <tr><td>Story, reel cover</td><td class="num">1080×1920</td><td>Text in the middle 60%.</td></tr>
    <tr><td>Link preview (OG)</td><td class="num">1200×630</td><td>See “Applying it”.</td></tr>
    <tr><td>LinkedIn banner / X header</td><td class="num">1584×396 · 1500×500</td><td>Text starts 30% from the left.</td></tr>
    <tr><td>Avatar</td><td class="num">800×800</td><td>The mark. Works round and square.</td></tr>
    <tr><td>YouTube thumbnail</td><td class="num">1280×720</td><td>Five words at most.</td></tr>
    <tr><td>Captions</td><td>—</td><td>First line is the headline. One link, three hashtags at most, alt text on every image.</td></tr>
  </tbody></table></div>
</section>

<section class="g-ch" id="apply">
  ${head('apply', 'Applying it', 'Same rules,', 'every surface.', 'Link previews, slides and documents, built from the same tokens.')}
  <div class="g-stage"><div class="g-og" data-theme="${alt}"><p class="ttl"><span>${setup}</span> ${payoff}</p><div class="side"><img src="${logoOn(alt)}" alt=""><span class="Q_small">${esc(cfg.url || '')}</span><span class="pill">${esc(ctaP)}</span></div></div><div class="g-cap"><span>Link preview / OG image</span><span>1200×630</span></div></div>
  <div class="g-two">
    <div class="g-stage"><div class="g-slide" data-theme="${def}"><span class="Q_label">Chapter 01</span><p class="ttl"><span>${setup}</span> ${payoff}</p><div class="ft"><img src="${logoOn(def)}" alt=""><span class="Q_micro">01 / 12</span></div></div><div class="g-cap"><span>Deck slide</span><span>16:9</span></div></div>
    <div class="g-stage" data-theme="light"><div class="g-doc"><div class="top"><img src="${logoOn('light')}" alt=""><span class="Q_micro">Proposal · ${esc(cfg.version || '')}</span></div><span class="Q_label is-quiet">Prepared for a partner</span><h5>${payoff}</h5><table><tr><td>Discovery</td><td>Week 1</td></tr><tr><td>Design</td><td>Week 2</td></tr><tr><td>Launch</td><td>Week 3</td></tr></table><span class="Q_small">Documents always use the light theme, A4 or Letter.</span></div><div class="g-cap"><span>Document · light</span><span>A4</span></div></div>
  </div>
</section>

<section class="g-ch" id="ai">
  ${head('ai', 'Use with AI', 'Any AI,', 'still on brand.', `This kit includes an AI pack: the whole brand as plain text plus a short prompt. Give it to ChatGPT, Claude, DeepSeek, Gemini or a coding tool and what comes back uses ${esc(cfg.name)}’s colours, fonts, components and voice.`)}
  <div class="g-cols">
    <div class="g-card"><span class="Q_label is-quiet">ChatGPT</span><b>Project or custom GPT</b><p>Upload ai/BRAND.md, ai/starter.html and the brand folder. Paste the prompt below into the instructions.</p></div>
    <div class="g-card"><span class="Q_label is-quiet">Claude</span><b>Project</b><p>Add the same files to project knowledge and paste the prompt into the project instructions.</p></div>
    <div class="g-card"><span class="Q_label is-quiet">DeepSeek, Gemini, others</span><b>Attach and paste</b><p>Attach ai/BRAND.md and paste the prompt as your first message. In Gemini, save it as a Gem.</p></div>
    <div class="g-card"><span class="Q_label is-quiet">Cursor, Copilot, Codex</span><b>Drop the folder in</b><p>AGENTS.md, CLAUDE.md and the rules files make coding tools read BRAND.md on their own.</p></div>
  </div>
  <div class="g-prompt"><div class="bar"><span class="Q_label">ai/system-prompt.txt</span><div><button class="Q_btn is-ghost is-sm" type="button" data-copy="g-ai-prompt">Copy prompt</button><button class="Q_btn is-solid is-sm" type="button" data-copy="g-ai-md">Copy full BRAND.md</button></div></div><pre id="g-ai-prompt">${esc(x.systemPrompt)}</pre></div>
  <script type="text/markdown" id="g-ai-md">${x.brandMd.replace(/<\/script/gi, '<\\/script')}</script>
  <p class="g-p"><b>Check the result:</b> run <code>node ai/check-brand.mjs page.html</code>. It lists any colour, font, emoji or banned word that is off-brand, line by line.</p>
</section>

<section class="g-ch" id="tokens">
  ${head('tokens', 'Tokens and files', 'One config,', 'every file.', `Everything in this kit is generated from one config file, so the guideline, the website code and the AI pack always agree.`)}
  <div class="g-table-wrap"><table class="g-table"><thead><tr><th>File</th><th>What it is</th></tr></thead><tbody>
    <tr><td><code>brand/tokens.css</code></td><td>CSS variables for both themes (<code>--Q_*</code>).</td></tr>
    <tr><td><code>brand/components.css</code></td><td>The classes on this page: <code>.Q_btn</code>, <code>.Q_label</code>, <code>.Q_h2</code> …</td></tr>
    <tr><td><code>brand/tailwind-theme.css</code></td><td>Tailwind v4: <code>bg-Q_bg</code>, <code>text-Q_text</code>, <code>bg-Q_accent</code>, <code>font-display</code>.</td></tr>
    <tr><td><code>brand/tokens.json</code></td><td>Design tokens for Figma (Tokens Studio) and other tools.</td></tr>
    <tr><td><code>brand/logo-*.svg</code>, <code>brand/icons/</code></td><td>Logo files and the icon set.</td></tr>
    <tr><td><code>ai/</code></td><td>BRAND.md, the system prompt, a starter page and the brand checker.</td></tr>
    <tr><td><code>AGENTS.md</code>, <code>CLAUDE.md</code>, <code>.cursor/</code>, <code>.github/</code></td><td>Rules files for coding AIs. Put them at the root of the website’s code.</td></tr>
  </tbody></table></div>
  <footer class="g-foot"><span class="Q_micro">${esc(cfg.legalName || cfg.name)} · Brand guideline ${esc(cfg.version || '')}</span><span class="Q_micro">Made by MuzMesh Creative</span></footer>
</section>

</main></div></div>

<script>
(function () {
  /* contents highlight on scroll */
  var links = [].slice.call(document.querySelectorAll('.g-toc a'));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function spy() { var y = innerHeight * .35, cur = 0; secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= y) cur = i; }); links.forEach(function (a, i) { a.setAttribute('aria-current', i === cur ? 'true' : 'false'); }); }
  addEventListener('scroll', spy, { passive: true }); spy();
  /* theme preview */
  var btn = document.getElementById('g-theme'), root = document.documentElement, logoImg = document.querySelector('.g-nav .logo img');
  btn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    logoImg.src = logoImg.getAttribute('data-logo-' + next);
    btn.textContent = (next === 'dark' ? 'Light' : 'Dark') + ' theme';
  });
  /* copy buttons */
  [].forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    b.addEventListener('click', function () {
      var txt = document.getElementById(b.getAttribute('data-copy')).textContent.trim(), label = b.textContent;
      function done(ok) { b.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(function () { b.textContent = label; }, 1600); }
      function fallback() { var t = document.createElement('textarea'); t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); done(ok); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(function () { done(true); }, fallback); else fallback();
    });
  });
})();
</script>
</body>
</html>
`;
  // keep the embedded BRAND.md untouched by the prefix swap
  const md = x.brandMd.replace(/<\/script/gi, '<\\/script');
  const [before, after] = html.split(md);
  const swap = (s) => s.replace(/Q_ROOT/g, p).replace(/Q_/g, `${p}-`);
  return swap(before) + md + swap(after);
};
