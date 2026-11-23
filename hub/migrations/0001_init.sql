-- Launch Room schema (Cloudflare D1 / SQLite).
-- Every client-owned row carries workspace_id. All reads and writes go through
-- src/lib/repo.ts, which always filters on it.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT '',
  -- MuzMesh team members: can see and manage every workspace.
  is_staff INTEGER NOT NULL DEFAULT 0 CHECK (is_staff IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  site_url TEXT NOT NULL DEFAULT '',
  cms TEXT NOT NULL DEFAULT 'sanity' CHECK (cms IN ('sanity', 'webflow', 'other')),
  cms_edit_url TEXT NOT NULL DEFAULT '',
  monthly_minutes INTEGER NOT NULL DEFAULT 120 CHECK (monthly_minutes >= 0),
  monthly_posts INTEGER NOT NULL DEFAULT 8 CHECK (monthly_posts >= 0),
  -- The client's brand.config.json from tools/brand-kit, stored as-is.
  brand_config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, workspace_id)
);
CREATE INDEX memberships_workspace ON memberships(workspace_id);

-- Sign-in links. Only the SHA-256 of the token is stored.
CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('linkedin', 'x')),
  copy TEXT NOT NULL DEFAULT '',
  -- Image template fields as JSON: {template, theme, kicker, headline, sub}. Empty object = no image.
  image TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'published')),
  scheduled_for TEXT, -- YYYY-MM-DD
  published_url TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  source TEXT NOT NULL DEFAULT 'hub' CHECK (source IN ('hub', 'mcp')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX posts_workspace_status ON posts(workspace_id, status);
CREATE INDEX posts_workspace_date ON posts(workspace_id, scheduled_for);

CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'declined')),
  source TEXT NOT NULL DEFAULT 'hub' CHECK (source IN ('hub', 'mcp')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  done_at TEXT
);
CREATE INDEX requests_workspace_status ON requests(workspace_id, status);

-- Time MuzMesh logs against a request. Counts toward the workspace's monthly limit.
CREATE TABLE time_entries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL CHECK (minutes > 0 AND minutes <= 1440),
  note TEXT NOT NULL DEFAULT '',
  logged_on TEXT NOT NULL, -- YYYY-MM-DD
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX time_entries_workspace_day ON time_entries(workspace_id, logged_on);
CREATE INDEX time_entries_request ON time_entries(request_id);

CREATE TABLE checklist_items (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  done_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX checklist_workspace ON checklist_items(workspace_id, position);

-- Who did what. Shown as history on posts and requests.
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('post', 'request', 'context', 'workspace')),
  subject_id TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  via TEXT NOT NULL DEFAULT 'hub' CHECK (via IN ('hub', 'mcp')),
  created_at TEXT NOT NULL
);
CREATE INDEX activity_subject ON activity(workspace_id, subject_type, subject_id, created_at);

-- Context Pack: one shared set of facts and rules per workspace, versioned on every save.
CREATE TABLE context_versions (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  body TEXT NOT NULL, -- JSON, see src/lib/context.ts
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, version)
);

-- Which version each person last exported for each AI app, to flag stale copies.
CREATE TABLE context_exports (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  version INTEGER NOT NULL,
  exported_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id, target)
);

-- OAuth 2.1 for the MCP connector. Clients are public (PKCE, no secret).
CREATE TABLE oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  redirect_uris TEXT NOT NULL, -- JSON array
  created_at TEXT NOT NULL
);

-- One row per "Allow" click. Codes and tokens hang off it so revoking is one update.
CREATE TABLE oauth_grants (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX oauth_grants_user ON oauth_grants(user_id);
CREATE INDEX oauth_grants_workspace ON oauth_grants(workspace_id);

CREATE TABLE oauth_codes (
  code_hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE oauth_tokens (
  token_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
  grant_id TEXT NOT NULL REFERENCES oauth_grants(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT, -- refresh tokens are single use
  created_at TEXT NOT NULL
);
CREATE INDEX oauth_tokens_grant ON oauth_tokens(grant_id);

-- Fixed-window counters for sign-in, OAuth and MCP rate limits.
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);
