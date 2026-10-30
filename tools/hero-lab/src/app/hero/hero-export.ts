import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { NAV_FILL } from "./hero-canvas";
import { loadHeroFont } from "./hero-font";
import { heroFontFamily, heroStretchKeyword, layoutHero } from "./hero-layout";
import { readHeroSettings } from "./hero-targets";
import { heroWordmark } from "./hero-wordmark";

/** Draws the hero foreground for PNG export. Runtime owns the background fill. */
export const heroExportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "muzmesh-hero",
  async renderFrame({ context: ctx, frame, signal, state }) {
    const s = readHeroSettings(state.values);
    const layout = layoutHero(s, frame.width, frame.height);
    const font = `${s.headlineWeight} ${layout.headline.fontPx}px '${heroFontFamily}'`;
    await loadHeroFont();
    await document.fonts.load(font);
    signal.throwIfAborted();

    ctx.save();
    // The context is in scene coordinates; layout is measured from the frame's top-left.
    ctx.translate(frame.x, frame.y);

    for (const card of layout.cards) {
      ctx.fillStyle = s.cardColor;
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, card.width, card.height, s.cardRadius);
      ctx.fill();
    }

    const { headline } = layout;
    ctx.font = font;
    ctx.fontStretch = heroStretchKeyword(s.headlineStretch) as CanvasFontStretch;
    ctx.letterSpacing = `${s.headlineTracking * headline.fontPx}px`;
    ctx.fillStyle = s.headlineColor;
    ctx.textBaseline = "alphabetic";
    headline.lines.forEach((line, i) => {
      const m = ctx.measureText(line);
      const contentHeight = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
      const baseline =
        headline.top + i * headline.lineHeightPx + (headline.lineHeightPx - contentHeight) / 2 + m.fontBoundingBoxAscent;
      ctx.fillText(line, headline.x, baseline);
    });

    const { nav } = layout;
    if (nav) {
      ctx.fillStyle = NAV_FILL;
      ctx.beginPath();
      ctx.roundRect(nav.pill.x, nav.pill.y, nav.pill.width, nav.pill.height, nav.radius);
      ctx.fill();
      ctx.fillStyle = s.headlineColor;
      ctx.save();
      ctx.translate(nav.logo.x, nav.logo.y);
      ctx.scale(nav.logo.width / heroWordmark.width, nav.logo.height / heroWordmark.height);
      ctx.fill(new Path2D(heroWordmark.path));
      ctx.restore();
      for (const bar of nav.burger) {
        ctx.beginPath();
        ctx.roundRect(bar.x, bar.y, bar.width, bar.height, 1);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};
