# Launch Room

The dashboard MuzMesh and its clients share. One app, two views:

- **Clients** plan and approve social posts, ask for site changes, see how much of their monthly edit time is used, open their brand kit, and keep one **context pack** that every AI they use reads from.
- **MuzMesh** sees every client in one place, manages workspaces, people and brand kits, and logs time against requests.

It is also an **MCP connector**. A client adds one address to Claude or ChatGPT and their own AI subscription can read the context pack and brand rules, check copy, and save drafts for review. The connector can never approve, publish or delete: a person does that in Launch Room.

This is phase 1. Not built yet: analytics and monthly reports (phase 2), posting to LinkedIn and X for you, an icon maker, file uploads on requests, and WebMCP (phase 3). Publishing today is assisted: copy the text, open the network with it filled in, paste the live link back.

## How it is built

| Part | Choice |
| --- | --- |
| App | Astro (server-rendered) on Cloudflare Workers. Works without JavaScript; scripts only add the live preview. |
| Database | Cloudflare D1 (SQLite). Schema in `migrations/`. |
| Sign-in | Invite-only email links. No passwords. Sessions in an http-only cookie. |
| Connector | `/mcp` (MCP over Streamable HTTP) with OAuth 2.1: dynamic client registration, PKCE, rotating refresh tokens. |
| Email | Resend, for sign-in links only. |

Everything that changes client data goes through `src/lib/service.ts` (or `src/lib/admin.ts` for MuzMesh-only changes). Pages and connector tools call the same functions, so roles, the brand check and the activity log apply to both. Every query in `src/lib/repo.ts` filters by workspace.

Roles: **viewer** reads. **Editor** writes posts and sends requests. **Owner** also approves posts, edits the context pack and ticks the launch checklist. **MuzMesh** staff can do all of that in every workspace, plus settings, people and time.

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
5. `npm run build && npx wrangler deploy`
6. Point a domain at the Worker (for example `room.muzmesh.com`) in the Cloudflare dashboard, then sign in with the bootstrap address.

Never set `DEV_SHOW_LOGIN_LINK` in production. It is ignored anywhere but localhost in any case. The build also declares a `SESSION` KV binding that Astro's Cloudflare adapter adds; Launch Room does not use it and Wrangler creates it for you on deploy.

## Setting up a client

1. **All clients, New client.** Name, site link, editor link, hours and posts per month.
2. **Settings, Brand kit.** Paste the client's `brand.config.json` from `tools/brand-kit`. This drives the brand page, the image templates, the "never write" list in the brand check, and the voice section of the context pack.
3. **Settings, People.** Add the client's team by email with a role. No invitation is sent; tell them the address.
4. **Context pack.** Fill in the company facts with the client. Only list claims and numbers that are verified.

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
