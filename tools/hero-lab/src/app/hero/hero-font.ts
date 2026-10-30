import archivoUrl from "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url";

import { heroFontFamily } from "./hero-layout";

// Archivo (brand font) with its width and weight axes, registered once for preview and export.
let loading: Promise<void> | null = null;

export function loadHeroFont(): Promise<void> {
  loading ??= (async () => {
    const face = new FontFace(heroFontFamily, `url(${archivoUrl}) format("woff2")`, {
      stretch: "62% 125%",
      weight: "100 900",
    });
    document.fonts.add(await face.load());
  })();
  return loading;
}
