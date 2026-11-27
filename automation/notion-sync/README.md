# Notion context sync

Keeps the Notion page "Muzmesh Context (auto-sync)" up to date with the project's context, so every tool (Claude Code, Codex, Claude desktop and browser) shares the same picture.

| Script | What it does |
|---|---|
| `sync.mjs` | Writes three pages: **Worktrees & git** (every worktree's branch, ahead/behind `main`, uncommitted files, recent commits), **Claude memory**, and **Claude sessions** (prompts from Claude Code, Claude desktop Code/Cowork and Codex in the last 14 days). It only rewrites a page that changed and redacts secrets and emails. |
| `read-context.mjs [chat\|memory\|sessions\|worktrees\|all]` | Prints a page as text. Defaults to **Chat log**. |
| `log-context.mjs "<tool>" "<topic>" "<bullet>"...` | Appends a dated entry to **Chat log**. |

Claude chats on desktop and in the browser write to **Chat log** directly through the Notion connector.

## Setup

1. Create an internal connection in Notion (Settings → Developer tools → Developer connections) with read, update and insert content. Under **Content access**, give it the context page.
2. `cp .env.example .env` and fill in `NOTION_TOKEN` and `NOTION_PARENT_PAGE_ID`.
3. Schedule `sync.mjs` every 5 minutes. On this Mac it runs as the Orca automation "Sync Muzmesh context to Notion": a precheck runs the script and always exits 1, so no agent starts. Output goes to `sync.log`. `install.sh` sets up a launchd job instead, for machines without Orca.
4. For agents, point them at `read-context.mjs` and `log-context.mjs` in `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`.

Requires Node 22+. No dependencies.
