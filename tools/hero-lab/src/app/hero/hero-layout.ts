import type { HeroSettings } from "./hero-targets";
import { heroWordmark } from "./hero-wordmark";

export type HeroRect = Readonly<{ x: number; y: number; width: number; height: number }>;

export type HeroLayout = Readonly<{
  cards: readonly HeroRect[];
  headline: Readonly<{
    fontPx: number;
    lineHeightPx: number;
    lines: readonly string[];
    top: number;
    x: number;
  }>;
  nav: Readonly<{
    burger: readonly HeroRect[];
    logo: HeroRect;
    pill: HeroRect;
    radius: number;
  }> | null;
}>;

// Nav pill sizes are fixed pixels, as on the reference.
const NAV = { burgerGap: 6, burgerHeight: 2, burgerRight: 19.5, burgerWidth: 17.5, height: 56, left: 36, logoHeight: 17.8, padX: 16, radius: 8, top: 19, width: 232 };
// Pull the first letter's side bearing back to the content edge.
const HEADLINE_INDENT_EM = -0.032;

/** One layout for both the live preview and PNG export, in scene pixels. */
export function layoutHero(s: HeroSettings, width: number, height: number): HeroLayout {
  const container = width * (1 - (2 * s.sideSpace) / 100);
  const left = (width - container) / 2;
  const count = Math.max(1, Math.round(s.cardCount));
  const cardWidth = (container - (count - 1) * s.cardGap) / count;
  const cardHeight = cardWidth / s.cardRatio;
  const cardsTop = height - s.bottomSpace - cardHeight;
  const cards = Array.from({ length: count }, (_, i) => ({
    height: cardHeight,
    width: cardWidth,
    x: left + i * (cardWidth + s.cardGap),
    y: cardsTop,
  }));

  const fontPx = (s.headlineSize / 100) * container;
  const lineHeightPx = fontPx * s.headlineLeading;
  // A " / " or a new line starts the next headline line.
  const lines = s.headlineText.toUpperCase().split(/\s*\/\s*|\n/);
  const top = cardsTop - s.headlineGap - lines.length * lineHeightPx;

  const logoWidth = (NAV.logoHeight * heroWordmark.width) / heroWordmark.height;
  const burgerX = NAV.left + NAV.width - NAV.burgerRight - NAV.burgerWidth;
  const burgerTop = NAV.top + (NAV.height - (2 * NAV.burgerHeight + NAV.burgerGap)) / 2;
  const nav = s.navVisible
    ? {
        burger: [0, 1].map((i) => ({
          height: NAV.burgerHeight,
          width: NAV.burgerWidth,
          x: burgerX,
          y: burgerTop + i * (NAV.burgerHeight + NAV.burgerGap),
        })),
        logo: {
          height: NAV.logoHeight,
          width: logoWidth,
          x: NAV.left + NAV.padX,
          y: NAV.top + (NAV.height - NAV.logoHeight) / 2,
        },
        pill: { height: NAV.height, width: NAV.width, x: NAV.left, y: NAV.top },
        radius: NAV.radius,
      }
    : null;

  return {
    cards,
    headline: { fontPx, lineHeightPx, lines, top, x: left + HEADLINE_INDENT_EM * fontPx },
    nav,
  };
}

export const heroFontFamily = "MuzMesh Archivo";

export function heroStretchKeyword(percent: number): string {
  const keywords: ReadonlyArray<readonly [number, string]> = [
    [75, "condensed"], [87.5, "semi-condensed"], [100, "normal"], [112.5, "semi-expanded"], [125, "expanded"],
  ];
  return keywords.reduce((best, k) => (Math.abs(k[0] - percent) < Math.abs(best[0] - percent) ? k : best))[1];
}
