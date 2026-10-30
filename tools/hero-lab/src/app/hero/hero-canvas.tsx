import * as React from "react";

import { useToolcraftEvaluatedValues, useToolcraftProductSceneFrame } from "@/toolcraft/runtime/react";

import { loadHeroFont } from "./hero-font";
import { heroFontFamily, layoutHero } from "./hero-layout";
import { readHeroSettings } from "./hero-targets";
import { heroWordmark } from "./hero-wordmark";

const NAV_FILL = "#151517";

/** Live hero preview. Positions come from the same layout the PNG export uses. */
export function HeroCanvas(): React.JSX.Element | null {
  const frame = useToolcraftProductSceneFrame();
  const values = useToolcraftEvaluatedValues();
  const [, setFontReady] = React.useState(false);
  React.useEffect(() => {
    void loadHeroFont().then(() => setFontReady(true));
  }, []);
  if (frame.kind !== "ready") return null;
  const { width, height } = frame.rect;
  const s = readHeroSettings(values);
  const layout = layoutHero(s, width, height);
  const { headline, nav } = layout;

  return (
    <div data-hero-preview="" style={{ height, overflow: "hidden", position: "relative", width }}>
      {headline.lines.map((line, i) => (
        <div
          key={i}
          style={{
            color: s.headlineColor,
            fontFamily: `'${heroFontFamily}', sans-serif`,
            fontSize: headline.fontPx,
            fontStretch: `${s.headlineStretch}%`,
            fontWeight: s.headlineWeight,
            left: headline.x,
            letterSpacing: `${s.headlineTracking}em`,
            lineHeight: `${headline.lineHeightPx}px`,
            position: "absolute",
            top: headline.top + i * headline.lineHeightPx,
            whiteSpace: "pre",
          }}
        >
          {line}
        </div>
      ))}
      {layout.cards.map((card, i) => (
        <div
          key={i}
          style={{
            background: s.cardColor,
            borderRadius: s.cardRadius,
            height: card.height,
            left: card.x,
            position: "absolute",
            top: card.y,
            width: card.width,
          }}
        />
      ))}
      {nav ? (
        <>
          <div
            style={{
              background: NAV_FILL,
              borderRadius: nav.radius,
              height: nav.pill.height,
              left: nav.pill.x,
              position: "absolute",
              top: nav.pill.y,
              width: nav.pill.width,
            }}
          />
          <svg
            aria-label="MuzMesh Creative"
            height={nav.logo.height}
            style={{ left: nav.logo.x, position: "absolute", top: nav.logo.y }}
            viewBox={`0 0 ${heroWordmark.width} ${heroWordmark.height}`}
            width={nav.logo.width}
          >
            <path d={heroWordmark.path} fill={s.headlineColor} />
          </svg>
          {nav.burger.map((bar, i) => (
            <div
              key={i}
              style={{
                background: s.headlineColor,
                borderRadius: 1,
                height: bar.height,
                left: bar.x,
                position: "absolute",
                top: bar.y,
                width: bar.width,
              }}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

export { NAV_FILL };
