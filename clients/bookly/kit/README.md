# Bookly brand kit

Everything you need to keep Bookly on brand, whoever (or whatever) is making the next page.

## What's inside

| File | What it is |
|---|---|
| `brand-guidelines.html` | The visual guideline. Open it in any browser. |
| `brand/tokens.css` | Colours, fonts, sizes and spacing as CSS variables (`--bk-*`), light and dark themes. |
| `brand/components.css` | Ready-made classes: `.bk-btn`, `.bk-label`, `.bk-h2` and more. |
| `brand/tailwind-theme.css` | The same tokens for Tailwind v4. |
| `brand/tokens.json` | Design tokens for Figma (Tokens Studio) and other tools. |
| `brand/logo-*.svg`, `brand/icons/` | Logo files and the icon set. |
| `ai/BRAND.md` | **The whole brand as plain text for AI tools.** |
| `ai/system-prompt.txt` | A short prompt to paste into ChatGPT, Claude, DeepSeek or Gemini. |
| `ai/starter.html` | A working on-brand page for AIs to copy from. |
| `ai/check-brand.mjs` | Checks any page for off-brand colours, fonts and words. |
| `AGENTS.md`, `CLAUDE.md`, `.cursor/`, `.github/` | Put these at the root of your website's code so coding AIs follow the brand automatically. |

## Using it with AI

- **ChatGPT:** create a Project or custom GPT. Upload `ai/BRAND.md`, `ai/starter.html`, the CSS and logo files. Paste `ai/system-prompt.txt` into the instructions.
- **Claude:** create a Project, add the same files to its knowledge, paste the prompt into the project instructions.
- **DeepSeek, Gemini and others:** attach `ai/BRAND.md` and paste the prompt as your first message. In Gemini, save it as a Gem.
- **Cursor, Copilot, Codex, Windsurf, Claude Code:** copy this whole folder into your project. The agent files make them read `ai/BRAND.md` on their own.

Then ask normally: “Build a pricing page”, “Write a 6-slide LinkedIn carousel about …”, “Turn this into a one-page proposal”.

## Checking the result

With Node.js installed:

```
node ai/check-brand.mjs page.html
```

It lists anything off-brand, line by line. The checklist at the end of `ai/BRAND.md` covers the rest.

Made by MuzMesh Creative.
