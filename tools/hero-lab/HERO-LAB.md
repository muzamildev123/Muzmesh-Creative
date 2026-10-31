# MuzMesh hero lab (Toolcraft)

A Toolcraft app for fine-tuning the homepage hero (the Driftime-style layout from
`tools/hero-base/hero.html`).

```
cd tools/hero-lab
npm install
npm run dev
```

- **Headline:** text (type ` / ` for a new line), size, line height, letter spacing, weight, width, colour.
- **Cards:** how many, shape, gap, corners, fill.
- **Layout:** side space, bottom space, headline-to-cards gap, menu pill on/off.
- **Background:** in Settings at the top.
- **Copy CSS** puts the settings on the clipboard as CSS variables for the site hero.
- **Export PNG** saves a picture of the hero.
- **Export Settings / Import Settings** save and load a tuning as a file.

Product code lives in `src/app/hero/`, wired up in `src/app/app-schema.ts` and
`src/app/app-composition.tsx`. Everything else is Toolcraft's own runtime.
