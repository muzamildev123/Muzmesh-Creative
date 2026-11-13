# Launch Room

The dashboard MuzMesh and its clients share. One app, two views:

- **Clients** plan and approve social posts that then **post themselves to LinkedIn and X** at the time they picked, see their **website stats** (Google Analytics, Search Console and clicks on post links), keep their logos, photos and made images in an **assets library**, make on-brand images, open their site editor (Sanity) and ask for site changes, and keep one **context pack** that every AI they use reads from.
- **MuzMesh** sees every client in one place, manages workspaces, people and brand kits, and logs time against requests.

It is also an **MCP connector**. A client adds one address to Claude or ChatGPT and their own AI subscription can read the context pack and brand rules, check copy, and save drafts for review. The connector can never approve, publish or delete: a person does that in Launch Room.

Clients reach it from their own site at **yoursite.com/admin**, a redirect to their workspace (Settings shows the snippet for Vercel, Netlify or Cloudflare Pages).

Not built yet: monthly PDF reports, Instagram, Facebook and other networks, an icon maker, file uploads on requests, and WebMCP. A post without a connected account is still published by hand: copy the text, open the network with it filled in, paste the live link back.

Tabs: **Overview** (stats, what needs you, what is coming up), **Posts**, **Calendar**, **Assets** (library, image maker, brand kit), **Site** (open Sanity, the site, Clarity, change requests, edit hours, launch checklist), **Accounts** (LinkedIn and X, AI apps, context pack), and **Settings** for MuzMesh.

## How it is built

| Part | Choice |
| --- | --- |
| App | Astro (server-rendered) on Cloudflare Workers. Works without JavaScript; scripts only add the live preview. |
| Database | Cloudflare D1 (SQLite). Schema in `migrations/`. |
| Sign-in | Invite-only email links. No passwords. Sessions in an http-only cookie. |
| Connector | `/mcp` (MCP over Streamable HTTP) with OAuth 2.1: dynamic client registration, PKCE, rotating refresh tokens. |
| Files | Cloudflare R2 (`FILES` binding) for the assets library and post images. Served only to members, sandboxed. |
| Posting | LinkedIn Posts API and X API v2, plain `fetch`, OAuth 2.0 (PKCE for X). Tokens encrypted with AES-256-GCM (`TOKEN_KEY`). |
| Scheduler | A Worker cron trigger every 5 minutes (`src/worker.ts`), plus "Post now" and "Run the scheduler now". |
| Stats | Google Analytics Data API and Search Console API with one service account, refreshed nightly and kept in D1. |
| Email | Resend, for sign-in links and "a post did not go out" alerts. |

Everything that changes client data goes through `src/lib/service.ts` (or `src/lib/admin.ts` for MuzMesh-only changes). Pages and connector tools call the same functions, so roles, the brand check and the activity log apply to both. Every query in `src/lib/repo.ts` filters by workspace.

Roles: **viewer** reads. **Editor** writes and schedules posts, adds files and sends requests. **Owner** also approves posts, connects and disconnects LinkedIn and X accounts, edits the context pack and ticks the launch checklist. **MuzMesh** staff can do all of that in every workspace, plus settings, people and time.

## Run it locally

Needs Node 22 or newer.

```sh
cd hub
npm install
cp .dev.vars.example .dev.vars
npm run db:local        # create the local database
npm run seed:local      # optional: a made-up demo client, "Bookly"
npm run dev             # http://localhost:4321
```

Sign in with `you@example.com` (MuzMesh), or `owner@bookly.test`, `editor@bookly.test`, `viewer@bookly.test`. Locally the sign-in link is shown on screen instead of being emailed.

Without the seed, the first sign-in with the `BOOTSTRAP_ADMIN_EMAIL` address creates the first MuzMesh account. That only works while there are no users at all.

## Checks

```sh
npm test                # unit tests: roles, tenant isolation, brand check, sign-in, OAuth, connector tools
npm run build           # type check, then build

# With the app running on a freshly seeded database:
npm install --no-save playwright axe-core
node e2e/smoke.mjs      # real browser: sign-in, approval flow, requests, context pack, OAuth + the official MCP client
node e2e/a11y.mjs       # axe accessibility pass over every screen

# Posting, assets and stats against a fake LinkedIn, X and Google (nothing real is posted):
node e2e/fake-networks.mjs &   # then point .dev.vars at it, see the top of that file
node e2e/publishing.mjs        # connect accounts, upload, make an image, schedule, approve, scheduler, retry, short links, stats
```

To run the browser checks against the production build (with the Content-Security-Policy on), use `npm run build && npm run preview -- --port 4321` instead of `npm run dev`.

## Deploy to Cloudflare (free plan)

1. `npx wrangler login`
2. `npx wrangler d1 create launch-room`, then put the `database_id` it prints into `wrangler.jsonc`.
3. `npm run db:remote`
4. Set the secrets:
   ```sh
   npx wrangler secret put BOOTSTRAP_ADMIN_EMAIL   # your own address, used once to create the first MuzMesh account
   npx wrangler secret put RESEND_API_KEY          # from resend.com
   npx wrangler secret put EMAIL_FROM              # e.g. Launch Room <login@yourdomain.com>, on a domain verified in Resend
   ```
5. Files and posting:
   ```sh
   npx wrangler r2 bucket create launch-room-files
   openssl rand -base64 32 | npx wrangler secret put TOKEN_KEY   # keep a copy: losing it means reconnecting every account
   ```
   In `wrangler.jsonc` set `APP_ORIGIN` to the app's real address (for example `https://room.muzmesh.com`).
6. **LinkedIn**: create an app at linkedin.com/developers, add the products "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect", and add the redirect URL `<APP_ORIGIN>/connect/linkedin/callback`. Then `wrangler secret put LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`. That posts as a person. To post as a **company page**, apply for the Community Management API in the same app; once approved, set `LINKEDIN_ORG_POSTING` to `1` and people reconnect.
7. **X**: create a project and app at developer.x.com, turn on OAuth 2.0 as a "Web App" with read and write, callback `<APP_ORIGIN>/connect/x/callback`, and buy API credits (pay per use: about $0.015 a post, $0.20 for a post with a link). Then `wrangler secret put X_CLIENT_ID` and `X_CLIENT_SECRET`.
8. **Stats**: in Google Cloud, create a service account, turn on the "Google Analytics Data API" and "Google Search Console API", create a JSON key and `wrangler secret put GOOGLE_SERVICE_ACCOUNT` with the whole JSON. Each client adds the service account's email to their GA4 property (Viewer) and Search Console (Restricted user); Settings shows the address.
9. `npm run build && npx wrangler deploy`
10. Point a domain at the Worker (for example `room.muzmesh.com`) in the Cloudflare dashboard, then sign in with the bootstrap address.

The free Workers plan allows 10 ms of CPU per request; waiting on LinkedIn or X does not count, so a scheduler run fits. If many clients post at the same minute, the paid plan ($5 a month) removes the limit.

Never set `DEV_SHOW_LOGIN_LINK` in production. It is ignored anywhere but localhost in any case. The build also declares a `SESSION` KV binding that Astro's Cloudflare adapter adds; Launch Room does not use it and Wrangler creates it for you on deploy.

## Setting up a client

1. **All clients, New client.** Name, site link, editor link, hours and posts per month.
2. **Settings, Brand kit.** Paste the client's `brand.config.json` from `tools/brand-kit`. This drives the brand page, the image templates, the "never write" list in the brand check, and the voice section of the context pack.
3. **Settings, People.** Add the client's team by email with a role. No invitation is sent; tell them the address.
4. **Context pack.** Fill in the company facts with the client. Only list claims and numbers that are verified.
5. **Settings, Posting and stats.** Time zone, the GA4 property ID, the Search Console property, the Clarity link, and the client's site address. Then add the `/admin` redirect from the snippet to their site.
6. **Accounts.** An owner on the client side (or MuzMesh) connects LinkedIn and X. A post goes out by itself only when it has an account, a date and a time, and an owner approved it. Any change to the text, image or account needs a new approval.

## Automatic posting, in detail

- Every 5 minutes the scheduler takes approved posts whose time has passed. A post is claimed before it is sent, so it cannot go out twice.
- Links in the text are swapped for short links (`/l/<code>`) that count clicks per post, leaving out link previews and crawlers.
- A template image is drawn in the browser when the post is saved and stored as a PNG, and approval waits for it, so the image that goes out is the one the owner saw.
- If LinkedIn or X is busy it tries again after 5, 15, 30 and 60 minutes, then stops. If the account was signed out, it marks it "needs reconnecting". Either way the owners and the post's author get an email, the post shows the problem, and "Try again now" or "Publish it by hand instead" are one click away.
- LinkedIn sign-ins last 60 days; Accounts shows a reminder in the last week. X sign-ins renew themselves.

Not yet checked against the live LinkedIn and X APIs (everything here was tested against a fake of each): company page listing, the LinkedIn text escaping for hashtags and mentions, and X's media upload. Try one real post on each network before relying on it for a client.

## Connecting an AI app

The Connect AI tab in each workspace shows the address (`https://<your-domain>/mcp`) and the steps for Claude and ChatGPT. The person signs in, picks a workspace and allows it. The app then acts with that person's role in that one workspace. They can disconnect it from the same tab, and removing someone from a workspace cuts their connected apps off at once.

Tools: `get_context`, `get_brand_kit`, `check_copy`, `list_posts`, `get_post`, `create_post_draft`, `update_post_draft`, `submit_post_for_review`, `list_requests`, `create_request`, `get_hours`. Prompts: `write_post`, `plan_month`.

For AI apps without connectors, the Context pack tab exports the same pack as a file plus matching instructions for a Claude Project, a ChatGPT Project or GPT, a Gemini Gem, or anything else, and flags a person's copy as out of date after the pack changes.

## Security notes

- State-changing requests must come from the app's own origin (checked in `src/middleware.ts`). The OAuth token, registration and `/mcp` endpoints are exempt because they never read cookies.
- Production responses carry a strict Content-Security-Policy: no inline scripts or styles.
- Sign-in links, sessions, OAuth codes and tokens are stored only as SHA-256 hashes. Links and codes are single use. A reused code or refresh token revokes the whole connection.
- A workspace you cannot open answers exactly like one that does not exist.
- Sign-in, registration, token and connector calls are rate limited per address or per connection.
- LinkedIn and X tokens are encrypted at rest with `TOKEN_KEY`; a copy of the database alone cannot post. The account connection must be finished by the same person who started it.
- Uploaded files are checked by their first bytes, stored per workspace, served only to its members, and sent with a sandboxing policy so an SVG or PDF cannot run scripts.
