# MuzMesh Creative website

The new muzmeshcreative.com: an Astro + TypeScript + Tailwind site in `web/`, blog posts and case studies edited in Sanity Studio in `studio/`, hosted on Vercel.

Start with **[docs/project-brief.md](docs/project-brief.md)**: goals, team, phases and open questions on one page.

Strategy, offer, copy, sitemap and the 301 redirect map live in **[docs/positioning.md](docs/positioning.md)**. Site copy comes from there.

## Two folders, two apps

```
web/      the website (Astro + TypeScript + Tailwind), deployed to Vercel
studio/   Sanity Studio, where the team writes blog posts and case studies
docs/     strategy, positioning, redirects
```

Each folder has its own `package.json`. Run `npm install` inside each one. Needs Node 22+ (`.nvmrc`).

## One-time Sanity setup

1. Create a free project at [sanity.io/manage](https://www.sanity.io/manage) (dataset `production`, **public**). Copy the project ID.
2. `cp web/.env.example web/.env` and set `SANITY_PROJECT_ID`.
3. `cp studio/.env.example studio/.env` and set `SANITY_STUDIO_PROJECT_ID` (same ID).
4. Import the old content once: `cd studio && npm install && npx sanity login && npm run migrate`. This keeps every slug, so all URLs and 301s stay the same, and copies cover images off Webflow's CDN.
5. Put the Studio online for the team: `cd studio && npm run deploy` (https://muzmesh.sanity.studio). Invite your teammates in sanity.io/manage -> Members.
6. Vercel: set **Root Directory** to `web`, add `SANITY_PROJECT_ID` and `SANITY_DATASET=production` for Production and Preview.
7. Auto-publish: in Vercel -> Settings -> Git -> Deploy Hooks, create a hook for `main`. In sanity.io/manage -> API -> Webhooks, add that URL, dataset `production`, trigger on create/update/delete, filter `_type in ["post", "caseStudy", "author"]`. Now Publish in the Studio rebuilds the site in about a minute.

## Run it

```bash
cd web && npm install && npm run dev      # site:   http://localhost:4321
cd studio && npm install && npm run dev   # studio: http://localhost:3333
```

`npm run build` in `web/` type checks and builds to `web/dist/`. It needs `SANITY_PROJECT_ID`, because blog posts and case studies come from Sanity.

## Where things are

```
docs/positioning.md               offer, tiers, referral rules, homepage copy, sitemap, redirects
web/src/data/site.ts              nav, four pillars, plans/prices, team (edit copy here)
web/src/content.config.ts         content collections: blog + work from Sanity, industries from files
web/src/lib/sanity.ts             Sanity client and the loader that turns documents into collections
web/src/content/industries/       industry pages (Markdown, stay in code)
web/src/pages/                    one file per route
web/src/components/               Astro components; ContactForm.tsx is the only React island
web/vercel.json                   301 redirects from old Webflow URLs
studio/schemaTypes/               Sanity document types: post, caseStudy, author
studio/scripts/migrate-content.ts one-off import of the old posts (studio/scripts/legacy/)
```

## Content rules

- Never publish invented results, testimonials, client names or statistics.
- Unverified content is marked: the **Not verified yet** switch in Sanity, `placeholder: true` in industry frontmatter, or `<Placeholder />` in pages. All show a visible yellow banner. New Sanity documents start with it on.
- Never change a published slug in Sanity without adding a 301 in `web/vercel.json`.

## Adding content

- **Blog post / case study:** in the Studio. Fill case study `results` only with real, client-approved numbers.
- **Industry:** add `web/src/content/industries/my-slug.mdx`.

## Team workflow

1. One branch per task: `feature/plans-page`, `fix/footer-links`, `content/topklik-case-study`.
2. Open a pull request. Vercel posts a preview link on every PR.
3. Another team member reviews the preview and the code, then merges.
4. `main` deploys to production. Design in Figma first, then code.

## Lead system (next phase)

The contact form posts JSON to `PUBLIC_LEAD_ENDPOINT`. Plan: n8n webhook, save to Supabase, instant reply and team notification via Resend, 3-day follow-up, monthly report. Add Cloudflare Turnstile verified server-side before launch; the honeypot and time check are only a first filter.

## Launch and SEO

See section 8 of `docs/positioning.md`. Short version: test every old URL on the Vercel preview, switch DNS at GoDaddy, submit `sitemap-index.xml` in Search Console, keep Webflow for 2+ weeks.

**Images:** the migration copies blog cover images into Sanity. Check any image links inside post bodies before cancelling Webflow.
