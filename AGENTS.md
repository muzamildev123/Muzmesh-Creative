# Instructions for AI agents

Before you design or write anything for MuzMesh (a page, component, social post, deck, document, email or copy), read **`docs/brand/ai/BRAND.md`** and follow it. It has the exact colours, fonts, components, voice and a final checklist.

- Web pages: wrap in `class="mm"`, use `web/src/styles/tokens.css` and `brand.css`, and copy patterns from `docs/brand/ai/starter.html`.
- Never add new hex colours or fonts. Only Inter Tight, and JetBrains Mono for labels and data.
- One orange primary button per view, with dark `#0E0E10` text.
- Run `node docs/brand/ai/check-brand.mjs <file>` on what you made and fix everything it reports.
- To change a brand value, edit `docs/brand/build-tokens.mjs` and run `node docs/brand/build-tokens.mjs`. Never hand-edit generated files.
- The full visual guideline is `docs/brand/brand-guidelines.html`.
