# Client brand kit generator

Builds a complete, AI-ready brand kit for a client from one config file: the brand guideline page, tokens (CSS, JSON, Tailwind), components, logo files, icons, a social kit and an AI pack (BRAND.md, system prompt, starter page, checker, agent rule files). Every text colour is contrast-checked and adjusted automatically.

## Make a kit for a new client

```
node tools/brand-kit/build.mjs --new acme      # creates clients/acme/brand.config.json from the Bookly example
# edit clients/acme/brand.config.json, put logo SVGs and photos in clients/acme/assets/
node tools/brand-kit/build.mjs clients/acme    # writes clients/acme/kit/
```

Open `clients/acme/kit/brand-guidelines.html` to review, then zip `clients/acme/kit/` and hand it over. The kit's own `README.md` tells the client how to use it with ChatGPT, Claude, DeepSeek, Gemini, Cursor and Copilot.

`clients/bookly/` is a full worked example (light theme, Fraunces and Inter, one green).

## The config

| Key | What it sets |
|---|---|
| `name`, `legalName`, `version`, `url`, `email`, `category` | Names and contact details used across the guideline and AI pack. |
| `prefix` | Two or three letters for CSS: `bk` gives `--bk-accent` and `.bk-btn`. |
| `idea.headline` | `[setup, payoff]`: the two-tone headline used on the cover, posts and examples. |
| `idea.promise`, `idea.personality`, `idea.pillars[]` | The brand idea chapter. |
| `theme.default` | `light` or `dark`. The other theme is generated too and switchable with `data-theme`. |
| `colors.light`, `colors.dark`, `colors.textOnLight`, `colors.textOnDark`, `colors.accent` | The five core colours (`hex`, `name`, `use`). Muted and faint text, surfaces, borders, hover, press, accent text and the label on the accent are derived and checked for contrast. |
| `colors.support[]` | Extra colours, marked "decoration only" automatically if they fail contrast as text. |
| `fonts.display`, `fonts.body`, `fonts.label` | Google Fonts families, weights, fallbacks and tracking. `label.style` is `mono` or `caps`. |
| `shape.radius` | `sharp`, `soft` or `round`. `shape.buttons`: `pill`, `rounded` or `square`. |
| `labelMarker` | `square`, `dot`, `line` or `none`: the mark before every label. |
| `logo.files` | `onLight`, `onDark`, `mark` SVG paths (relative to the client folder). Leave empty to use a typeset wordmark until a logo exists. |
| `logo.wordmark` | The text, font (`display` or `body`), weight and tracking for that typeset wordmark. |
| `voice` | `headline`, `summary`, `use`, `avoid` (also the checker's banned words), `write`, `not`, `ctaPrimary`, `ctaSecondary`, `names`. |
| `imagery` | `headline`, `summary`, `do`, `dont`, `photoPrompt`, and `images[]` (paths to up to three photos shown in the guideline and social kit). |

## Files

- `build.mjs`: colour maths, tokens and file writing.
- `templates/guideline.mjs`: the guideline page (13 chapters, light/dark preview toggle, contents scrollspy, copy buttons).
- `templates/components.css.mjs`: the component classes.
- `templates/brand-md.mjs`: BRAND.md and the short system prompt.
- `templates/starter.mjs`: the on-brand starter page.
- `templates/handover.md`: the README that ships inside each kit.
- `check-brand.mjs`: the checker copied into each kit.

The MuzMesh guideline itself (`docs/brand/`) is built separately by `docs/brand/build-tokens.mjs`; it has more bespoke chapters than the client template.
