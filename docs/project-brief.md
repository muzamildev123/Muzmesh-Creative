# MuzMesh Creative: Project Brief

Version 0.1 (draft) · 30 Oct 2026 · Owner: Muzamil Awan

Read this first. It is the one-page view of what we are doing, why, who does what and when. The detail (offer wording, tier contents, referral rules, homepage copy, sitemap, redirect map) lives in **[positioning.md](positioning.md)**. This brief links to it instead of repeating it.

**Placeholder rule.** Anything marked `[PLACEHOLDER]`, `[CONFIRM]` or `[OPEN]` is not decided or not verified. We never publish invented results, client names, testimonials or statistics.

---

## 1. The project in one paragraph

MuzMesh Creative is moving from "freelance Webflow developer" to a 3-person studio that sells **one monthly retainer** covering design, website, social content and automation. We are rebuilding muzmeshcreative.com so a visitor understands that offer in seconds and books a call, and we are building a lead system so every enquiry gets an instant reply and a follow-up.

## 2. Why we are doing this

From the audit of the current Webflow site:

- **Wrong position.** "Webflow developer for startups and SaaS" is a crowded, price-shopped niche, sold as $1,500-$3,000 one-off projects.
- **Not a lead source.** Only 11 form submissions since May: 4 our own tests, 3 blank, 3 spam or cold outreach, 1 generic enquiry. No traffic data (Webflow Analyze is off). Real clients come from Upwork, Fiverr and Contra.
- **Trust problems.** Placeholder and unnamed testimonials, unsupported claims, a concept project shown as live work, case studies with no results, broken footer links, placeholder socials, a contact form with no qualifying fields or spam protection, and recent edits never published.
- **Assets worth keeping.** The Topklik.ai automation case study (our best proof), the `/dubai-interior-design` and `/websites-for-remodelers` pages (already sell the bundle), and the website-cost blog post.

## 3. Goals

What "done" looks like for this project:

1. New site live on muzmeshcreative.com, with the retainer offer clear on the homepage in five seconds.
2. Every old URL either kept or 301-redirected, with no drop in indexed pages after launch.
3. A working lead system: qualifying form, saved to a database, instant reply, team notification, 3-day follow-up, monthly report.
4. Only real, verified proof on the site. If we have one real case study at launch, we show one.
5. A team workflow (branches, reviews, preview links) that all three of us can use.

Success measures after launch `[CONFIRM targets]`:

| Measure | Today | Target |
|---|---|---|
| Real enquiries per month from the site | ~1 since May | `[CONFIRM]` |
| Discovery calls booked per month | not tracked | `[CONFIRM]` |
| Retainer clients signed | 0 | `[CONFIRM]` in first 3 months |
| Time to first reply on an enquiry | not tracked | under 5 minutes (automated) |

## 4. The offer (summary)

Full detail: [positioning.md, section 3](positioning.md#3-the-offer).

- **Monthly retainer, fixed scope, 3-month minimum.** One plan, one price, one invoice. We recommend the tier; we do not make the client choose from three.
- **Four pillars:** Design & Brand, Web Development (Webflow, WordPress, custom code; Shopify and Wix as secondary), Social & Content, Automation & Systems. Line: *"We pick the platform that fits your business."*
- **Three tiers** (starting points to test, site shows "From $X/mo"):

| Tier | Range | What it adds |
|---|---|---|
| Launch | $1.5k-2.5k/mo, 3 months | Brand kit, website, SEO/AEO setup, light support |
| Growth | $2.5k-4k/mo | Launch + 12-16 social posts/month, content calendar, design requests |
| Scale | $4k-7k/mo | Growth + lead capture, CRM, follow-ups, reporting, priority support |

- **Industries:** show 2-3 with real proof, never "all industries". `[OPEN]` Candidates: remodelers, interior design studios (Dubai/UAE), SaaS/AI. Recommendation in [positioning.md, section 2](positioning.md#2-focus-industries).

## 5. Referral program (summary)

Full rules and contract wording: [positioning.md, section 4](positioning.md#4-referral-rules).

- **Clients:** an active retainer client who refers a new client gets 50% off one month, applied after the new client pays their first invoice. Max one discounted month per billing cycle; extra referrals roll forward as credit. Written into the contract.
- **Partners** (outside freelancers, agencies): cash commission of about 10% of the referred client's first 3 months, paid as each invoice is paid.
- **Risk to decide:** a Scale client referring a Launch client costs us more than we earn in month one. Suggested cap: discount up to the value of the referred client's first invoice. `[CONFIRM]`

## 6. How we sell

1. 20-minute discovery call.
2. Short audit (Loom or 2-page PDF) within 2 business days.
3. Proposal recommending one fixed tier.
4. Contract and first invoice. Work starts when it is paid.

The contact form qualifies for step 1 (budget, needs, timeline). Detail in [positioning.md, section 5](positioning.md#5-pitch-flow).

## 7. The website

**Pages:** Home, Services (4 pillars), Plans, Work (Topklik first), Industries (2-3), How We Work, Referral, About/Team, Blog, Contact/Book a call, Privacy, Terms, 404. Full sitemap with URLs: [positioning.md, section 7](positioning.md#7-sitemap-new-site).

**Tech stack** (already scaffolded in this repo):

| Part | Choice |
|---|---|
| Framework | Astro + TypeScript |
| Styling | Tailwind CSS |
| Content | MDX content collections: `blog`, `work`, `industries` |
| Interactivity | React islands only where needed (today: the contact form) |
| Code | GitHub repo `muzamildev123/Muzmesh-Creative` |
| Hosting | Vercel, preview link on every PR |
| Domain | Stays at GoDaddy. Only DNS records change. |
| Future client portal | Separate Next.js app (e.g. `app.muzmeshcreative.com`), not part of this project |

How to run it and where files live: [README](../README.md).

## 8. Lead system

```
Contact form ──> n8n webhook ──> Supabase (save lead)
                     │
                     ├──> Resend: instant reply to the lead
                     ├──> Team notification `[CONFIRM: email / Slack / WhatsApp]`
                     ├──> Day 3: follow-up email if no call booked
                     └──> Monthly: lead report (count, source, response time)
```

- The form posts to `PUBLIC_LEAD_ENDPOINT` (see `.env.example`). It already has a honeypot and a time check.
- **Before launch:** add Cloudflare Turnstile, verified server-side. The honeypot alone will not stop spam.
- Booking link for "Book a call" buttons: `PUBLIC_BOOKING_URL` `[CONFIRM: Cal.com or Calendly]`.
- Accounts needed: Supabase project, n8n instance `[CONFIRM: self-hosted or n8n cloud]`, Resend with the domain verified (DNS records at GoDaddy).

## 9. Protecting SEO

Full redirect table: [positioning.md, section 8](positioning.md#8-301-redirect-map-old-webflow--new-astro).

1. Keep or 301-redirect every old URL (`/post/...`, `/portfolio/...`, `/services/...`, `/case-studies/...`, `/reviews/...`). Redirects live in `vercel.json`.
2. Build and test on a Vercel preview. Webflow stays live until we approve.
3. Before the DNS switch, test every old URL on the preview: one 301 hop to a page that loads.
4. Switch DNS at GoDaddy. Submit the new sitemap in Search Console.
5. Check Search Console daily for 2 weeks. Cancel Webflow only after 2+ clean weeks.
6. Move images off Webflow's CDN into the repo before cancelling Webflow.

## 10. Team and roles

| Person | Role | Owns |
|---|---|---|
| Muzamil Awan | Development and automation | Astro build, lead system, redirects, Vercel, DNS |
| `[PLACEHOLDER: Friend 1]` | `[CONFIRM: Design & Brand?]` | `[CONFIRM: Figma design, brand kit]` |
| `[PLACEHOLDER: Friend 2]` | `[CONFIRM: Social & Content?]` | `[CONFIRM: copy edits, case study write-ups, socials]` |

**Workflow:**

- Design in Figma first, then code.
- One repo. One branch per task (`feature/plans-page`, `fix/footer-links`, `content/topklik-case-study`).
- Every change goes through a pull request, reviewed by another team member, with a Vercel preview link.
- `main` deploys to production.
- PR checklist is in `.github/pull_request_template.md`.

## 11. Phases and timeline

Start date `[CONFIRM]`. Weeks count from that date.

| Phase | Weeks | Output | Owner | Status |
|---|---|---|---|---|
| 1. Strategy and copy | 1 | Positioning doc, homepage copy, sitemap, redirect map | Muzamil | Draft done, in review (PR #1) |
| 2. Figma design | 1-2 | Home, Plans, Work, Industry, Contact pages in Figma | `[CONFIRM]` | Not started |
| 3. Astro build and lead system | 2-4 | All pages built, content migrated, form wired to n8n + Supabase + Resend | Muzamil | Scaffold done (PR #1); lead system not started |
| 4. QA, SEO, redirects | 5 | Every old URL tested, meta tags, sitemap, Turnstile, mobile check | Muzamil + reviewer | Not started |
| 5. Launch and monitoring | 5-6 | DNS switch, Search Console, 2 weeks of checks, then cancel Webflow | Muzamil | Not started |

**Launch blockers** (site does not go live until these are done):

- [ ] No `[PLACEHOLDER]` content left: `grep -rln "placeholder: true\|<Placeholder" src/content src/pages` returns nothing
- [ ] Final prices confirmed
- [ ] 2-3 industries confirmed, each with a real page
- [ ] Topklik case study has real, client-approved results (or no result line at all)
- [ ] Privacy and Terms pages have real text
- [ ] Contact form delivers leads end to end, with Turnstile
- [ ] Every old URL redirects correctly on the preview

## 12. Risks

| Risk | What we do about it |
|---|---|
| Retainer prices are far above today's one-off prices, with little published proof | Expect early deals at the low end. Get real numbers from Topklik first. Raise prices as proof grows. |
| Rebuild loses Google rankings | Redirect every URL, test on preview, keep Webflow 2+ weeks, watch Search Console. |
| Site is not where clients come from today | Use the site as the place we send Upwork/Contra/referral leads to close them, not only as a traffic source. Track source on every enquiry. |
| Referral discount costs more than it earns | Cap the discount at the referred client's first invoice (see section 5). |
| Scope creep inside a fixed retainer | Each tier lists monthly limits. Extra work is quoted or moves the client up a tier. |
| Friends' availability and skills not confirmed | Confirm roles before Phase 2. Muzamil can cover design with a template if needed, but it will look weaker. |

## 13. Open questions

Answers go into this brief and [positioning.md](positioning.md).

1. Exact names, skills and roles of Friend 1 and Friend 2.
2. Which 2-3 industries we lead with.
3. Who writes code besides Muzamil, and their comfort with Astro and React.
4. Search Console data for the old site (top pages and queries).
5. Final USD prices per tier, and whether to show AED.
6. Which portfolio and case study entries are real paid client work.
7. Where `/dubai-interior-design` and `/websites-for-remodelers` live (not in the Webflow page list).
8. Project start date, and success targets for section 3.
9. Booking tool (Cal.com or Calendly), n8n hosting, and where team notifications go.
