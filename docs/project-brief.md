# MuzMesh Creative: Project Brief

Version 0.2 (draft) · 30 Oct 2026 · Owner: Muzamil Awan

Read this first. It is the one-page view of what we are doing, why, who does what and when. The detail (homepage copy, sitemap, redirect map) lives in **[positioning.md](positioning.md)**. This brief links to it instead of repeating it.

> **v0.2 change (30 Oct 2026): new direction.** We now focus on **AI startups** at **$500 setup + $200/month**, replacing the three-tier $1.5k-7k/mo offer. `positioning.md` is updated to match. The site code in the repo still shows the old offer and is the next thing to update.

**Placeholder rule.** Anything marked `[PLACEHOLDER]`, `[CONFIRM]` or `[OPEN]` is not decided or not verified. We never publish invented results, client names, testimonials or statistics.

---

## 1. The project in one paragraph

MuzMesh Creative is moving from "freelance Webflow developer" to a 3-person studio that **gets AI startups launched online**: a hand-designed landing page (not AI slop), social media, AEO/GEO, tracking, CRM, and a headless CMS (Sanity or similar), then keeps the site and social running on a monthly retainer. We are rebuilding muzmeshcreative.com so a founder understands that offer in seconds and books a call, and we are building a lead system so every enquiry gets an instant reply and a follow-up.

## 2. Why we are doing this

From the audit of the current Webflow site:

- **Wrong position.** "Webflow developer for startups and SaaS" is a crowded, price-shopped niche, sold as $1,500-$3,000 one-off projects.
- **Not a lead source.** Only 11 form submissions since May: 4 our own tests, 3 blank, 3 spam or cold outreach, 1 generic enquiry. No traffic data (Webflow Analyze is off). Real clients come from Upwork, Fiverr and Contra.
- **Trust problems.** Placeholder and unnamed testimonials, unsupported claims, a concept project shown as live work, case studies with no results, broken footer links, placeholder socials, a contact form with no qualifying fields or spam protection, and recent edits never published.
- **Assets worth keeping.** The Topklik.ai automation case study (our best proof), the `/dubai-interior-design` and `/websites-for-remodelers` pages (already sell the bundle), and the website-cost blog post.

## 3. Goals

What "done" looks like for this project:

1. New site live on muzmeshcreative.com, so an AI startup founder understands the offer on the homepage in five seconds.
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

## 4. The offer

Full detail (exact limits, what is not included, homepage copy): [positioning.md, section 3](positioning.md#3-the-offer).

**Who it is for:** AI startups, pre-launch to seed `[CONFIRM: include Series A?]`, with no designer, marketer or web developer.

**Price (decided 30 Oct 2026): $500 one-time setup + $200/month, everything included.** Setup paid upfront.

**Promise: "Get AI-ready in 5 days."** 5 business days from when we have payment, logo, copy draft and account access. Prove it on 1-2 real clients before putting it on the site; until then say "in about a week". Retainer starts the month after launch, 3-month minimum `[CONFIRM]`.

| $500 setup | $200/month |
|---|---|
| One landing page designed in Figma (not AI slop), 1 revision round before launch, 1 after | Up to `[CONFIRM: 2]` hours of site edits, updates, backups |
| Sanity headless CMS (copy, blog, changelog) | Up to `[CONFIRM: 8]` social posts on 2 platforms |
| AEO/GEO: schema, FAQ, `llms.txt`, sitemap, Search Console | Support on one channel, reply within 2 business days |
| Tracking with conversion events | One-page monthly report |
| CRM: form to client's CRM, instant reply, team alert | |
| AI-ready content model with API access | |
| Social setup on 2 platforms, banners, 3 post templates | |

**How the price holds:** monthly limits are written down, unused hours don't roll over, extra pages or custom brand work are quoted separately, and every project reuses our own design system, Sanity starter and CRM/tracking setup. **Track hours on the first 3 clients**; if setup goes past about `[CONFIRM: 20]` hours or the retainer past about `[CONFIRM: 8]` hours a month, we reprice before client 4.

## 5. Referral program

Full rules: [positioning.md, section 4](positioning.md#4-referral-rules).

- An **active retainer client** who refers a **new** client gets **40% off their next monthly bill** ($80 on $200).
- Applied only **after the referred client pays their $500 setup**. Monthly retainer only, not setup fees.
- **Max one 40% discount per bill.** Extra referrals roll forward as credit. No cash value. Written into the contract.
- Partner commission for outside freelancers `[CONFIRM: keep or drop]`.

## 6. How we sell

1. 15-minute intro call.
2. Same-day one-page proposal (no free custom audit at this price).
3. Invoice and kickoff form. Work starts when the $500 is paid.
4. Launch, then the $200 retainer starts the following month.

The contact form qualifies for step 1: company, website, stage (pre-seed / seed / Series A), what they need, timeline. Detail in [positioning.md, section 5](positioning.md#5-pitch-flow).

## 7. The website

**Pages:** Home, Services, Pricing, Work (Topklik first), How We Work, Referral, About/Team, Blog, Contact/Book a call, Privacy, Terms, 404. Full sitemap with URLs: [positioning.md, section 7](positioning.md#7-sitemap-new-site).

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
| Client builds | Sanity (default headless CMS) + Astro or Next.js front end `[CONFIRM]`. Our own site stays on MDX for now; we can move it to Sanity later as a live demo of what we sell. |

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
| 1. Strategy and copy | 1 | Positioning doc, homepage copy, sitemap, redirect map | Muzamil | Positioning v0.2 for AI startups done (PR #2) |
| 2. Figma design | 1-2 | Home, Plans, Work, Industry, Contact pages in Figma | `[CONFIRM]` | Not started |
| 3. Astro build and lead system | 2-4 | All pages built, content migrated, form wired to n8n + Supabase + Resend | Muzamil | Scaffold done (PR #1); lead system not started |
| 4. QA, SEO, redirects | 5 | Every old URL tested, meta tags, sitemap, Turnstile, mobile check | Muzamil + reviewer | Not started |
| 5. Launch and monitoring | 5-6 | DNS switch, Search Console, 2 weeks of checks, then cancel Webflow | Muzamil | Not started |

**Launch blockers** (site does not go live until these are done):

- [ ] No `[PLACEHOLDER]` content left: `grep -rln "placeholder: true\|<Placeholder" src/content src/pages` returns nothing
- [ ] Final prices confirmed (section 4)
- [ ] Homepage and copy rewritten for AI startups
- [ ] Topklik case study has real, client-approved results (or no result line at all)
- [ ] Privacy and Terms pages have real text
- [ ] Contact form delivers leads end to end, with Turnstile
- [ ] Every old URL redirects correctly on the preview

## 12. Risks

| Risk | What we do about it |
|---|---|
| $500 + $200 is low for this much work | Written monthly limits, reuse our own design system and starters, track hours on the first 3 clients and reprice before client 4 if needed. |
| AI startups pivot, run out of money or churn fast | Setup paid upfront, 3-month minimum, clients own their accounts so handover is clean. |
| Little AI-startup proof besides Topklik | Lead with Topklik. Offer a lower price to the first 3 clients in exchange for a case study with real numbers. |
| Rebuild loses Google rankings | Redirect every URL, test on preview, keep Webflow 2+ weeks, watch Search Console. |
| Site is not where clients come from today | Use the site as the place we send Upwork/Contra/referral leads to close them, not only as a traffic source. Track source on every enquiry. |
| Referral discounts stack up | Max one 40% discount per bill, the rest rolls forward (section 5). |
| Scope creep inside a fixed retainer | Each tier lists monthly limits. Extra work is quoted or moves the client up a tier. |
| Friends' availability and skills not confirmed | Confirm roles before Phase 2. Muzamil can cover design with a template if needed, but it will look weaker. |

## 13. Open questions

Answers go into this brief and [positioning.md](positioning.md).

1. Exact names, skills and roles of Friend 1 and Friend 2.
2. ~~Which 2-3 industries we lead with.~~ Decided: AI startups. Do we keep remodelers and interior design pages at all, or redirect them?
3. Who writes code besides Muzamil, and their comfort with Astro and React.
4. Search Console data for the old site (top pages and queries).
5. ~~Final pricing.~~ Decided: $500 + $200. Still to confirm: the monthly limits in section 4 and upfront vs 50/50 payment.
6. Which portfolio and case study entries are real paid client work.
7. Where `/dubai-interior-design` and `/websites-for-remodelers` live (not in the Webflow page list).
8. Project start date, and success targets for section 3.
9. Booking tool (Cal.com or Calendly), n8n hosting, and where team notifications go.
10. Default stack for client builds: Sanity + Astro or Sanity + Next.js?
11. Social: confirm 8 posts/month on LinkedIn + X, and no comment/DM management.
