-- Client admin: auto-posting to LinkedIn and X, short links, the assets library and website stats.

-- Each workspace plans posts in its own local time. IANA name, e.g. "Asia/Karachi".
ALTER TABLE workspaces ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
-- Where the stats come from. Empty means not set up.
ALTER TABLE workspaces ADD COLUMN ga4_property_id TEXT NOT NULL DEFAULT '';
ALTER TABLE workspaces ADD COLUMN search_console_site TEXT NOT NULL DEFAULT '';
ALTER TABLE workspaces ADD COLUMN clarity_url TEXT NOT NULL DEFAULT '';
-- The client's own domain, for bookly.com/admin. Lowercase host, no scheme, e.g. "bookly.app".
ALTER TABLE workspaces ADD COLUMN admin_host TEXT NOT NULL DEFAULT '';

-- Local time of day for the planned date, "HH:MM". With scheduled_for and the workspace time zone
-- this gives publish_at, the exact moment (UTC) the scheduler posts it.
ALTER TABLE posts ADD COLUMN scheduled_time TEXT;
ALTER TABLE posts ADD COLUMN publish_at TEXT;
-- The connected account that posts it. Empty means publish by hand.
ALTER TABLE posts ADD COLUMN social_account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL;
-- Scheduler bookkeeping. claimed_at stops two runs posting the same thing.
ALTER TABLE posts ADD COLUMN publish_claimed_at TEXT;
ALTER TABLE posts ADD COLUMN publish_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN publish_error TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN external_id TEXT NOT NULL DEFAULT '';
CREATE INDEX posts_due ON posts(status, publish_at);

-- A LinkedIn or X account connected to a workspace. Tokens are encrypted with TOKEN_KEY (AES-GCM).
CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('linkedin', 'x')),
  -- LinkedIn: 'person' (a member's profile) or 'organization' (a company page). X: always 'person'.
  kind TEXT NOT NULL DEFAULT 'person' CHECK (kind IN ('person', 'organization')),
  -- urn:li:person:..., urn:li:organization:..., or the X user id.
  external_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL DEFAULT '',
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL DEFAULT '',
  expires_at TEXT,
  refresh_expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'reconnect')),
  last_error TEXT NOT NULL DEFAULT '',
  connected_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (workspace_id, network, external_id)
);

-- In-flight "Connect LinkedIn / X" sign-ins. The state is stored hashed; the PKCE verifier lives 10 minutes.
CREATE TABLE social_oauth_states (
  state_hash TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  return_to TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Short links put into posts so clicks can be counted on every network.
CREATE TABLE short_links (
  code TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  target_url TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX short_links_workspace ON short_links(workspace_id);
CREATE INDEX short_links_post ON short_links(post_id);
CREATE TABLE link_clicks (
  code TEXT NOT NULL REFERENCES short_links(code) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (code, day)
);

-- The assets library. Files live in R2 under r2_key; this is the index.
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'upload' CHECK (kind IN ('upload', 'made')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX assets_workspace ON assets(workspace_id, created_at);
-- A post can carry one library image instead of (or as well as) a template image.
ALTER TABLE posts ADD COLUMN asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL;

-- The latest stats pulled from Google for each workspace, as JSON. One row per workspace and source.
CREATE TABLE stats_snapshots (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('ga4', 'search_console')),
  body TEXT NOT NULL,
  error TEXT NOT NULL DEFAULT '',
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, source)
);

-- The template image, drawn in the browser and saved as a PNG so the scheduler can attach it.
-- image_rendered holds the image fields the PNG was drawn from, so a stale PNG is never posted.
ALTER TABLE posts ADD COLUMN render_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN image_rendered TEXT NOT NULL DEFAULT '';
