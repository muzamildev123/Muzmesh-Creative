// State targets for the MuzMesh hero. One place so schema, renderer and export agree.
export const heroTargets = {
  background: "appearance.background",
  includeBackground: "export.includeBackground",
  headlineText: "headline.text",
  headlineSize: "headline.size",
  headlineLeading: "headline.leading",
  headlineTracking: "headline.tracking",
  headlineWeight: "headline.weight",
  headlineStretch: "headline.stretch",
  headlineColor: "headline.color",
  cardCount: "cards.count",
  cardRatio: "cards.ratio",
  cardGap: "cards.gap",
  cardRadius: "cards.radius",
  cardColor: "cards.color",
  sideSpace: "layout.sideSpace",
  bottomSpace: "layout.bottomSpace",
  headlineGap: "layout.headlineGap",
  navVisible: "nav.visible",
} as const;

export type HeroSettings = Readonly<{
  background: string;
  headlineText: string;
  headlineSize: number;
  headlineLeading: number;
  headlineTracking: number;
  headlineWeight: number;
  headlineStretch: number;
  headlineColor: string;
  cardCount: number;
  cardRatio: number;
  cardGap: number;
  cardRadius: number;
  cardColor: string;
  sideSpace: number;
  bottomSpace: number;
  headlineGap: number;
  navVisible: boolean;
}>;

// Values measured from the reference hero at a 2227 x 1415 window, scaled to 1440 x 900.
export const heroDefaults: HeroSettings = {
  background: "#000000",
  headlineText: "Easy to spot. / Hard to forget.",
  headlineSize: 7.83,
  headlineLeading: 0.858,
  headlineTracking: -0.02,
  headlineWeight: 900,
  headlineStretch: 87.5,
  headlineColor: "#F5F3ED",
  cardCount: 3,
  cardRatio: 1.454,
  cardGap: 16,
  cardRadius: 4,
  cardColor: "#1C1C20",
  sideSpace: 14.07,
  bottomSpace: 76.5,
  headlineGap: 20,
  navVisible: true,
};

const cardRatioOptions = [1.454, 1.5, 1.333, 1, 0.8];
export { cardRatioOptions };

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function readHeroSettings(values: Readonly<Record<string, unknown>>): HeroSettings {
  const d = heroDefaults;
  const t = heroTargets;
  return {
    background: str(values[t.background], d.background),
    headlineText: str(values[t.headlineText], d.headlineText),
    headlineSize: num(values[t.headlineSize], d.headlineSize),
    headlineLeading: num(values[t.headlineLeading], d.headlineLeading),
    headlineTracking: num(values[t.headlineTracking], d.headlineTracking),
    headlineWeight: num(values[t.headlineWeight], d.headlineWeight),
    headlineStretch: num(Number(values[t.headlineStretch]), d.headlineStretch),
    headlineColor: str(values[t.headlineColor], d.headlineColor),
    cardCount: num(Number(values[t.cardCount]), d.cardCount),
    cardRatio: num(Number(values[t.cardRatio]), d.cardRatio),
    cardGap: num(values[t.cardGap], d.cardGap),
    cardRadius: num(values[t.cardRadius], d.cardRadius),
    cardColor: str(values[t.cardColor], d.cardColor),
    sideSpace: num(values[t.sideSpace], d.sideSpace),
    bottomSpace: num(values[t.bottomSpace], d.bottomSpace),
    headlineGap: num(values[t.headlineGap], d.headlineGap),
    navVisible: typeof values[t.navVisible] === "boolean" ? (values[t.navVisible] as boolean) : d.navVisible,
  };
}

/** CSS custom properties for the site. Sizes are relative so they hold at any width. */
export function heroCssText(s: HeroSettings): string {
  const lines = [
    `--hero-bg: ${s.background};`,
    `--container: ${round(100 - s.sideSpace * 2)}vw;`,
    `--hero-pad-bottom: ${round(s.bottomSpace)}px;`,
    `--h-size: ${round(s.headlineSize)}cqw;`,
    `--h-leading: ${round(s.headlineLeading)};`,
    `--h-tracking: ${round(s.headlineTracking)}em;`,
    `--h-weight: ${s.headlineWeight};`,
    `--h-stretch: ${round(s.headlineStretch)}%;`,
    `--h-color: ${s.headlineColor};`,
    `--h-gap: ${round(s.headlineGap)}px;`,
    `--card-count: ${s.cardCount};`,
    `--card-ratio: ${round(s.cardRatio)};`,
    `--card-gap: ${round(s.cardGap)}px;`,
    `--card-radius: ${round(s.cardRadius)}px;`,
  ];
  return `.hero {\n${lines.map((l) => `  ${l}`).join("\n")}\n}\n`;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
