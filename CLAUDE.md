# Working on MuzMesh Creative

## Brand (read before any design work)

For any page, section, social post, deck, document or other asset, follow the brand guideline first:

- `docs/brand/brand-guidelines.html`: logo, colours, type, components, voice and examples (v2, Nov 2026).
- `docs/brand/README.md`: how the token files fit together.
- New site pages use `web/src/styles/tokens.css` and `web/src/styles/brand.css` (`.mm`, `.mm-btn`, `.mm-label` …). Don't add new raw hex colours or fonts.
- To change a colour, size or font, edit `docs/brand/build-tokens.mjs` and run `node docs/brand/build-tokens.mjs`. Never hand-edit the generated files.
- `docs/brand/archive/v1/` (yellow, Archivo) is retired. Don't use it.

In short: a black page, bone text (#F4F4F1), one orange (#F2580F) with dark text on it, Inter Tight for all text and JetBrains Mono for labels only. The light Paper theme is for documents. The guideline has the full rules.
