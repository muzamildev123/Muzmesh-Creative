# MuzMesh hero tuner

A one-file slider panel for fine-tuning the homepage hero. No install, no build.
Open `index.html` in a browser (double-click it).

The base layout follows the Driftime hero (driftime.com): a full-screen black section,
a big tight uppercase headline sitting low on the left, and a row of image cards under it.

1. Pick a headline idea (Brand, Baggage, Cookie) or type your own.
   `*stars*` make words yellow, Enter makes a new line.
2. Click a card in the preview to put an image in it (or drop images on the preview).
3. Drag the sliders. Double-click a slider to reset it.
4. Pick **Phone** at the top to tune the phone layout. Desktop and Tablet share one set.
5. Press **Copy CSS for the site** and paste it into the hero component.

Your settings are remembered in this browser. Images are not saved, so load them again
next time. Use **Download JSON** to keep a copy or share it.

## Using the output in Astro

Sizes are in `cqw` (percent of the hero's width), so the numbers look the same at any
screen width. The hero markup only has to match these class names:

```astro
---
// src/components/Hero.astro
const cards = [
  { src: '/hero/card-1.jpg', alt: '' },
  { src: '/hero/card-2.jpg', alt: '' },
  { src: '/hero/card-3.jpg', alt: '' },
];
---
<section class="hero" data-cards="row">
  <div class="hero__inner">
    <h1 class="hero__headline">Brands that<br><span class="hero__accent">stand out.</span></h1>
    <div class="hero__cards">
      {cards.map((c) => <figure class="hero__card"><img src={c.src} alt={c.alt} /></figure>)}
    </div>
  </div>
</section>

<style>
  /* Paste "Copy CSS for the site" here */

  .hero { container-type: inline-size; position: relative; overflow: hidden;
          min-height: 100svh; background: var(--hero-bg);
          display: flex; flex-direction: column; justify-content: flex-end; }
  .hero__inner { width: 100%; max-width: var(--content-width); margin-inline: var(--content-align);
                 padding: 0 var(--hero-pad-x) var(--hero-pad-bottom); }
  .hero__headline { margin: 0 0 var(--headline-gap); max-width: var(--headline-width);
                    font-family: var(--font-display); font-stretch: var(--headline-stretch);
                    font-weight: var(--headline-weight); font-size: var(--headline-size);
                    line-height: var(--headline-leading); letter-spacing: var(--headline-tracking);
                    text-transform: var(--headline-case); color: var(--headline-color); }
  .hero__accent { color: var(--accent-color); }
  .hero__cards { display: grid; grid-template-columns: repeat(var(--card-count), minmax(0, 1fr));
                 gap: var(--card-gap); }
  .hero__card { margin: 0; overflow: hidden; aspect-ratio: var(--card-ratio);
                border-radius: var(--card-radius); }
  .hero__card img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .hero[data-cards="stack"] .hero__cards { grid-template-columns: 1fr; }
  /* Swipe row (good on phones). If the tuner says "swipe" on phones only,
     wrap this block in @media (max-width: 640px). */
  .hero[data-cards="swipe"] .hero__cards {
    grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: var(--card-swipe-width);
    overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;
    margin-right: calc(var(--hero-pad-x) * -1); padding-right: var(--hero-pad-x); }
  .hero[data-cards="swipe"] .hero__card { scroll-snap-align: start; }
</style>
```

Colours in the copied CSS use the site's brand tokens (`--color-paper`, `--color-ink`,
`--color-marker`) with the hex values as fallbacks, so they paste in as-is.

The site needs Archivo at weight 900 for the default look. Add `125,900` to the Google
Fonts link in the brand theme (the tuner already loads it).
