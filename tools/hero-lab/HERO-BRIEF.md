# MuzMesh hero lab: brief

This folder is a Toolcraft app (https://toolcraft.sh). It is **not** the website.
It is a small private tool for tuning the homepage hero by eye, with sliders,
and then copying the final numbers into the Astro site.

Run it:

```
cd tools/hero-lab
npm install
npm run dev
```

## What the tool should do

Show the hero exactly as it will look on the site: a photo, a cutout layer on
top of it, and the headline sitting between them or over them. Then give
sliders for the things that are hard to get right by guessing.

Two lead concepts (full prompts in `docs/hero/hero-out-of-the-box.md` in the
project files):

1. **Baggage carousel.** Headline: *Easy to spot. Hard to forget.*
   Black suitcases on a belt, one yellow case. Optional motion: the belt
   drifts slowly sideways, the yellow case stays sharp.
2. **Cookie cutter.** Headline: *Your brand isn't a cookie-cutter.*
   Overhead tray of identical prompt-bar cookies, one yellow hand-made cookie.

## Inputs

- Background photo (upload).
- Cutout image: the same photo's hero object as a PNG with transparency
  (the yellow suitcase or the yellow cookie). Make the cutout outside the tool
  (Photoshop, Figma, remove.bg). Toolcraft has no background remover.
- Concept switch: Baggage carousel / Cookie cutter (sets the headline text).

## Controls to expose

- Headline: size, line height, letter spacing, position X/Y, max width.
- Layer order: headline behind cutout / in front of cutout.
- Cutout: scale, X/Y offset, drop shadow strength.
- Photo: darken overlay (ink), blur of the background, crop focus X/Y.
- Motion (carousel only): belt drift speed, parallax amount on scroll.

## Brand rules

- Ink `#0E0E10`, paper `#F2F2EE`, yellow `#FFD60A` (the only bright colour).
- Headline font: Archivo at 125% width, weight 800.
- Full tokens: `docs/brand/tailwind-theme.css` and `muzmesh-tokens.json`.

## Output

An "Export settings" action that gives a small JSON file, for example
`hero-settings.json`, with every control value. The Astro hero component reads
that file, so the site never needs React or Toolcraft at runtime.

## Prompt to start building it with Claude Code

> Read AGENTS.md and HERO-BRIEF.md. Turn this starter into the MuzMesh hero lab
> described in HERO-BRIEF.md. Start with the Cookie cutter concept and static
> layers only (no motion yet). Export a JSON settings file.
