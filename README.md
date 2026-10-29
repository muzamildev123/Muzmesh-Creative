# MuzMesh Creative website

The new muzmeshcreative.com, built with Astro + TypeScript + Tailwind CSS + MDX, hosted on Vercel.

Strategy, offer, copy, sitemap and the 301 redirect map live in **[docs/positioning.md](docs/positioning.md)**. Site copy comes from there.

## Run it

Needs Node 22 (`.nvmrc`).

```bash
npm install
cp .env.example .env   # optional: lead endpoint + booking link
npm run dev            # http://localhost:4321
npm run build          # type check (astro check) + static build to dist/
npm run preview        # serve the build locally
```

## Where things are

```
docs/positioning.md           offer, tiers, referral rules, homepage copy, sitemap, redirects
src/data/site.ts              nav, four pillars, plans/prices, team (edit copy here)
src/content.config.ts         content collection schemas
src/content/blog/             blog posts (migrated from Webflow, old slugs kept)
src/content/work/             case studies
src/content/industries/       industry pages
src/pages/                    one file per route
src/components/               Astro components; ContactForm.tsx is the only React island
src/layouts/BaseLayout.astro  <head>, SEO tags, header and footer
vercel.json                   301 redirects from old Webflow URLs
```

## Content rules

- Never publish invented results, testimonials, client names or statistics.
- Unverified content is marked: `placeholder: true` in frontmatter, or `<Placeholder />` in pages. Both show a visible yellow banner.
- Before launch this must return nothing: `grep -rln "placeholder: true\|<Placeholder" src/content src/pages`

## Adding content

- **Blog post:** add `src/content/blog/my-slug.mdx` with `title`, `description`, `author`, `pubDate`. URL becomes `/blog/my-slug`.
- **Case study:** add `src/content/work/my-slug.mdx`. Fill `results` only with real, client-approved numbers.
- **Industry:** add `src/content/industries/my-slug.mdx`.

## Team workflow

1. One branch per task: `feature/plans-page`, `fix/footer-links`, `content/topklik-case-study`.
2. Open a pull request. Vercel posts a preview link on every PR.
3. Another team member reviews the preview and the code, then merges.
4. `main` deploys to production. Design in Figma first, then code.

## Lead system (next phase)

The contact form posts JSON to `PUBLIC_LEAD_ENDPOINT`. Plan: n8n webhook, save to Supabase, instant reply and team notification via Resend, 3-day follow-up, monthly report. Add Cloudflare Turnstile verified server-side before launch; the honeypot and time check are only a first filter.

## Launch and SEO

See section 8 of `docs/positioning.md`. Short version: test every old URL on the Vercel preview, switch DNS at GoDaddy, submit `sitemap-index.xml` in Search Console, keep Webflow for 2+ weeks.

**Images:** migrated blog posts and the Topklik entry still load images from Webflow's CDN (`cdn.prod.website-files.com`). Download them into the repo before cancelling Webflow.
