import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { heroDefaults as d, heroTargets as t } from "./hero-targets";

type Section = Readonly<{ controls: Record<string, ToolcraftControlSchema>; description?: string; id: string; title?: string }>;

const always = { mode: "always" } as const;

const background: Section = {
  controls: {
    includeBackground: {
      applicability: always, defaultValue: true, target: t.includeBackground, type: "switch",
    },
    background: {
      applicability: always, defaultValue: d.background, target: t.background, type: "color",
    },
  },
  id: "background",
  title: "Background",
};

const headline: Section = {
  controls: {
    text: {
      applicability: always, commitMode: "content", defaultValue: d.headlineText, label: "Text",
      description: "Type \" / \" to start a new line.",
      performanceReason: "Text length only changes a few DOM nodes.", performanceRole: "responsiveness",
      target: t.headlineText, textValueKind: "single-line", type: "text",
    },
    size: {
      applicability: always, defaultValue: d.headlineSize, label: "Size", max: 14, min: 3, step: 0.01, unit: "%",
      description: "Font size as a share of the content width, so it scales with the screen.",
      performanceReason: "Restyles one headline.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.headlineSize, type: "slider",
    },
    leading: {
      applicability: always, defaultValue: d.headlineLeading, label: "Line height", max: 1.3, min: 0.7, step: 0.001,
      performanceReason: "Restyles one headline.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.headlineLeading, type: "slider",
    },
    tracking: {
      applicability: always, defaultValue: d.headlineTracking, label: "Letter spacing", max: 0.06, min: -0.1, step: 0.001, unit: "em",
      performanceReason: "Restyles one headline.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.headlineTracking, type: "slider",
    },
    weight: {
      applicability: always, defaultValue: d.headlineWeight, label: "Weight", max: 900, min: 400, step: 100,
      performanceReason: "Restyles one headline.", performanceRole: "responsiveness",
      sliderValueKind: "discrete", target: t.headlineWeight, type: "slider",
    },
    stretch: {
      applicability: always, defaultValue: "87.5", label: "Width",
      options: [
        { label: "Narrow", value: "75" },
        { label: "Semi", value: "87.5" },
        { label: "Normal", value: "100" },
        { label: "Wide", value: "112.5" },
      ],
      target: t.headlineStretch, type: "segmented",
    },
    color: {
      applicability: always, defaultValue: d.headlineColor, label: "Color", target: t.headlineColor, type: "color",
    },
  },
  id: "headline",
  title: "Headline",
};

const cards: Section = {
  controls: {
    count: {
      applicability: always, defaultValue: "3", label: "Cards",
      options: [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
      ],
      target: t.cardCount, type: "segmented",
    },
    ratio: {
      applicability: always, defaultValue: "1.454", label: "Shape",
      options: [
        { label: "Reference (16:11)", value: "1.454" },
        { label: "3:2", value: "1.5" },
        { label: "4:3", value: "1.333" },
        { label: "Square", value: "1" },
        { label: "4:5", value: "0.8" },
      ],
      target: t.cardRatio, type: "select",
    },
    gap: {
      applicability: always, defaultValue: d.cardGap, label: "Gap", max: 64, min: 0, step: 1, unit: "px",
      performanceReason: "Moves up to four boxes.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.cardGap, type: "slider",
    },
    radius: {
      applicability: always, defaultValue: d.cardRadius, label: "Corners", max: 32, min: 0, step: 1, unit: "px",
      performanceReason: "Restyles up to four boxes.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.cardRadius, type: "slider",
    },
    color: {
      applicability: always, defaultValue: d.cardColor, label: "Fill", target: t.cardColor, type: "color",
    },
  },
  id: "cards",
  title: "Cards",
};

const layout: Section = {
  controls: {
    sideSpace: {
      applicability: always, defaultValue: d.sideSpace, label: "Side space", max: 25, min: 0, step: 0.01, unit: "%",
      description: "Space left and right of the content, as a share of the screen width.",
      performanceReason: "Moves the headline and cards.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.sideSpace, type: "slider",
    },
    bottomSpace: {
      applicability: always, defaultValue: d.bottomSpace, label: "Bottom space", max: 200, min: 0, step: 0.5, unit: "px",
      performanceReason: "Moves the headline and cards.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.bottomSpace, type: "slider",
    },
    headlineGap: {
      applicability: always, defaultValue: d.headlineGap, label: "Headline gap", max: 120, min: 0, step: 0.5, unit: "px",
      description: "Space between the last headline line and the cards.",
      performanceReason: "Moves the headline.", performanceRole: "responsiveness",
      sliderValueKind: "continuous", target: t.headlineGap, type: "slider",
    },
    nav: {
      applicability: always, defaultValue: d.navVisible, label: "Menu pill", target: t.navVisible, type: "switch",
    },
  },
  id: "layout",
  title: "Layout",
};

const output: Section = {
  controls: {
    copy: {
      actions: [{ icon: "copy", label: "Copy CSS", value: "hero.copyCss" }],
      applicability: always, defaultValue: null, label: false, target: "hero.actions", type: "panelActions",
    },
  },
  id: "output",
};

export const heroControlSections = [background, headline, cards, layout, output];
