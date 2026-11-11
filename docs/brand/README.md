# MuzMesh brand kit (v2, Nov 2026)

Open `brand-guidelines.html` in a browser for the full guideline.

- **Edit tokens in one place:** `build-tokens.mjs`. Then run `node docs/brand/build-tokens.mjs` from the repo root.
  It regenerates `muzmesh-tokens.json`, `tokens.css`, `tailwind-theme.css`, `brand.css` (copy), `web/src/styles/tokens.css`
  and `brand-guidelines.html`, and prints a contrast check for every text pair.
- **Edit the guideline text** in `guideline.src.html` (placeholders like `{{SWATCHES_LAUNCH}}` are filled by the script).
- **Edit components** in `web/src/styles/brand.css` (the site's copy is the source).
- **Logo files:** `muzmesh-wordmark.svg` (ink), `muzmesh-wordmark-light.svg` (bone), `muzmesh-avatar.svg`, `muzmesh-favicon.svg`.
  Outlined from Inter Tight Bold, so no font is needed to render them.
- `archive/v1/` holds the retired yellow + Archivo kit.
