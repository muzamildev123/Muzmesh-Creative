# MuzMesh hero tuner

A one-file slider panel for fine-tuning the homepage hero. No install, no build.
Open `index.html` in a browser (double-click it).

1. Load the background photo and the cutout PNG (or drop them on the preview).
2. Pick a concept: Baggage carousel or Cookie cutter.
3. Drag the sliders. Double-click a slider to reset it.
4. Pick **Phone** at the top to tune the phone layout. Desktop and Tablet share one set.
5. Press **Copy CSS for the site** and paste it into the hero component.

Your settings are remembered in this browser. Images are not saved, so load them again
next time. Use **Download JSON** to keep a copy or share it.

## Using the output in Astro

All sizes are in `cqw` (percent of the hero's width) and `%`, so the numbers look the
same at any screen width. The hero markup only has to match these class names:

```astro
---
// src/components/Hero.astro
import photo from '../assets/hero/photo.jpg';
import cutout from '../assets/hero/cutout.png';
---
<section class="hero">
  <img class="hero__photo" src={photo.src} alt="" />
  <div class="hero__overlay"></div>
  <h1 class="hero__headline">Easy to spot. <span class="hero__accent">Hard to forget.</span></h1>
  <img class="hero__cutout" src={cutout.src} alt="A hand-painted yellow suitcase" />
</section>

<style>
  /* Paste "Copy CSS for the site" here */

  .hero { container-type: inline-size; position: relative; overflow: hidden;
          aspect-ratio: var(--hero-ratio); background: var(--color-ink); }
  .hero__photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
                 object-position: var(--photo-focus-x) var(--photo-focus-y);
                 transform: scale(var(--photo-zoom)); filter: blur(var(--photo-blur)); }
  .hero__overlay { position: absolute; inset: 0; background: var(--color-ink); opacity: var(--overlay-opacity); }
  .hero__headline { position: absolute; margin: 0; left: var(--headline-x); top: var(--headline-y);
                    width: var(--headline-width); z-index: var(--headline-z);
                    font-family: var(--font-display); font-stretch: var(--headline-stretch);
                    font-weight: var(--headline-weight); font-size: var(--headline-size);
                    line-height: var(--headline-leading); letter-spacing: var(--headline-tracking);
                    text-align: var(--headline-align); color: var(--headline-color); text-wrap: balance; }
  .hero__accent { color: var(--color-marker); }
  .hero__cutout { position: absolute; left: var(--cutout-x); top: var(--cutout-y);
                  width: var(--cutout-width); z-index: var(--cutout-z);
                  transform: translate(-50%, -50%) rotate(var(--cutout-rotate));
                  filter: drop-shadow(0 var(--cutout-shadow-y) var(--cutout-shadow-blur)
                          rgb(0 0 0 / var(--cutout-shadow-opacity))); }
</style>
```

Colours in the copied CSS use the site's brand tokens (`--color-paper`, `--color-ink`,
`--color-marker`) with the hex values as fallbacks, so they paste in as-is.
