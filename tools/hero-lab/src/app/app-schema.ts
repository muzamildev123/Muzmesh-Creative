import { defineToolcraft, imageExportModule } from "@/toolcraft/runtime";

import appDefaults from "./app-defaults.json" with { type: "json" };
import { appIdentity } from "./app-identity";
import { heroControlSections } from "./hero/hero-sections";

export const appSchema = defineToolcraft({
  defaults: appDefaults,
  base: {
    canvas: {
      enabled: true,
      size: { height: 900, unit: "px", width: 1440 },
      sizing: { mode: "editable-output" },
      upload: false,
    },
    identity: appIdentity,
    panels: {
      controls: {
        sections: heroControlSections,
        title: "Hero",
      },
    },
    toolbar: {
      history: true,
      radar: true,
      zoom: true,
    },
  },
  modules: [imageExportModule()],
});
