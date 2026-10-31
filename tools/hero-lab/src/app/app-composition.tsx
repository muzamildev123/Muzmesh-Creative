import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "./app-schema";
import { HeroCanvas } from "./hero/hero-canvas";
import { heroExportRenderer } from "./hero/hero-export";
import { heroCssText, readHeroSettings } from "./hero/hero-targets";

export const appComposition = composeToolcraftApp(appSchema, {
  actions: {
    onPanelAction: async ({ action, reportFeedback, state }) => {
      if (action.value !== "hero.copyCss") return;
      await navigator.clipboard.writeText(heroCssText(readHeroSettings(state.values)));
      reportFeedback({ code: "copied", message: "CSS copied" });
    },
  },
  scene: {
    canvasContent: <HeroCanvas />,
    rasterFrameRenderer: heroExportRenderer,
    sceneBoundsProvider: ({ state }) => [
      {
        height: state.canvas.size.height,
        width: state.canvas.size.width,
        x: -state.canvas.size.width / 2,
        y: -state.canvas.size.height / 2,
      },
    ],
  },
});
