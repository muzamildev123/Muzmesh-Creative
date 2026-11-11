# AI brand pack

Everything an AI needs to make on-brand pages, posts, decks and documents. This pack is generated from the same token source as the website and the guideline, so it never drifts. Rebuild it with `node docs/brand/build-tokens.mjs`.

| File | What it is |
|---|---|
| `BRAND.md` | The full rules in plain text: colours, roles, contrast, type, layout, components, voice, logo, imagery, recipes, sizes, CSS variables and a final checklist. **Give this to any AI.** |
| `system-prompt.txt` | A short version (under 1,500 characters) for custom instructions and system prompts. |
| `starter.html` | A working on-brand page (nav, hero, section, cards, pricing pass, footer). AIs copy its patterns. |
| `tokens.css`, `brand.css` | The CSS variables and component classes the starter and the website use. |
| `muzmesh-*.svg` | Wordmark (light and dark) and avatar. |
| `check-brand.mjs` | Checks any HTML, CSS or SVG for off-brand colours, fonts, white-on-orange, emoji and banned words. |
| `brand-allowlist.json` | The palette, fonts and banned words the checker uses. |

## How to use it

**ChatGPT.** Make a Project (or a custom GPT). Upload `BRAND.md`, `starter.html`, `tokens.css`, `brand.css` and the SVGs as files. Paste `system-prompt.txt` into the project instructions. For a quick chat, attach `BRAND.md` and paste the prompt as your first message.

**Claude.** Make a Project, add the same files to its knowledge and paste `system-prompt.txt` into the project instructions. In Claude Code, the repo's `CLAUDE.md` already points here.

**DeepSeek, Gemini, Mistral, Grok and others.** Attach `BRAND.md` (and `starter.html` for web work) and paste `system-prompt.txt` as your first message. In Gemini, a Gem with these files works like a ChatGPT project.

**Cursor, Windsurf, Copilot, Codex, Gemini CLI.** Keep this folder in the repo. `AGENTS.md`, `.cursor/rules/brand.mdc` and `.github/copilot-instructions.md` at the repo root tell them to read `BRAND.md` first.

**Image tools (Midjourney, DALL·E, Firefly).** Use the photo prompt in `BRAND.md` section 8, never ask them for text or logos, and set the type afterwards in Inter Tight.

**Before you publish anything an AI made**, run:

```
node docs/brand/ai/check-brand.mjs path/to/page.html
```

It exits with an error and a list of lines to fix if anything is off-brand. The checklist at the end of `BRAND.md` covers what a script can't see (one idea per post, true numbers, real photos).

## Good prompts

- “Using BRAND.md and starter.html, build a pricing page with three tiers. One primary button.”
- “Write a 6-slide LinkedIn carousel on why AI startups look the same. Follow the carousel recipe in BRAND.md. Give me the copy per slide and the HTML for each 1080×1350 slide.”
- “Turn this text into a one-page proposal in the Paper theme.”
- “Check this page against BRAND.md and list every rule it breaks.”
