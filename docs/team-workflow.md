# Three-person AI development workflow

## Working agreement

Each developer uses their own Orca workspace, GitHub identity and model accounts. GitHub is the code/review record; [Notion](https://app.notion.com/p/424c3f20aab981d68b64ce8956115110) is the requirements and handoff record. Orca does not synchronize three developers' files or bypass provider limits.

One task has one human owner and a different human reviewer. Roles rotate by task; unknown team members are not preassigned. Ready → In progress → Review → Done; use Blocked with the missing access and exact next action. Each task records acceptance criteria, affected files, environment, branch/worktree, PR, preview and validation.

## Start and switch work

1. Read AGENTS.md, the relevant Notion project, latest Session Handoff and current Git status.
2. Claim the task and shared files. Use `feature/<task>`, `fix/<task>` or `chore/<task>`; start from the agreed base. Existing `staging` has newer visual editing changes; choose its base intentionally.
3. Import the clone into Orca. Create one worktree per task; setup hooks must not copy production .env files or run deployment/migration commands.
4. Pick Codex for ordinary work, Claude/Opus for a bounded complex problem, or OpenCode/OpenRouter for provider flexibility. Keep one writer per worktree and normal approvals enabled. Review context before sending client code to a new provider.
5. Before a usage limit or harness change, save code, fill the handoff template, stop the previous writer, then open the new harness in the same worktree. Read and verify the handoff before continuing.
6. Run relevant checks, open a PR, include a preview for UI changes, and obtain another human's review. Do not merge or deploy as part of workflow setup.

## Local onboarding

Use Node 22.18+ (or current supported Node), Git, Orca, Claude Code, Codex and OpenCode 2. The machine inspected on 26 November 2026 already has the apps; `orca` and `opencode` launchers now point to their installed bundles.

```sh
git clone https://github.com/muzamildev123/Muzmesh-Creative.git
cd Muzmesh-Creative
orca repo add --path "$PWD" --kind git --json
# In Orca create a task worktree; do not launch agents in parallel in one checkout.
claude auth login
codex login
opencode auth login
```

Authenticate locally; never paste credentials into chat. For OpenCode choose OpenRouter and select a model explicitly after setting a per-key/provider spending cap. Do not purchase credits as part of onboarding. The project config allows only OpenRouter in OpenCode; it deliberately has no default model. Existing global provider settings remain intact. Run `/connect` then `/models` in OpenCode to select the authenticated route. No model request was sent during setup.

The existing global OpenCode config on this Mac uses legacy `provider` syntax and an Orca localhost router. It was preserved. OpenCode 2 uses `providers` and ordered `permissions`; verify the effective project config with `opencode debug config --standalone` before use. Shell permissions are prompts, not a complete credential boundary.

## GitHub administration still required

The connected account `usamasaleem` has READ access. The repository owner must grant Write before a setup branch can be pushed. Identify and invite the remaining teammates individually; give least needed access. Never share the owner's login.

After the PR check exists, an administrator should protect `main` and `staging`: PR required, one independent approval, dismiss stale approvals, resolve conversations, require `Environment safeguards`, block force pushes/deletions and direct pushes (including administrators where supported). Confirm plan support; do not buy an upgrade. This document is not an enabled branch rule. Select real reviewers for CODEOWNERS later; no placeholder accounts are installed.

`main` is the existing production branch. Preview resources and staging credentials must be verified before connecting staging builds. Setup does not alter deployment integrations or merge existing feature branches. Launch Room currently lives on `claude/project-thread-3t0832` under `hub/`; its deployments, D1, R2, Google and social credentials need a separate environment review before applying changes there.

## Notion and offline fallback

Use the existing Projects, Decision Log, Resources and Session Handoffs databases; do not duplicate them. Token-free Notion server declarations are included for Claude Code (`.mcp.json`), Codex (`.codex/config.toml`) and OpenCode (`opencode.json`). Trust/review project configuration before loading it. Each harness must authorize its own Notion connection; access in this Codex chat does not confer access in another app. In Claude Code use `/mcp`; in trusted Codex CLI use `codex mcp login notion`; in OpenCode use `opencode mcp auth notion` or `/mcps`. Complete OAuth locally. Until connected, use `docs/handoff-template.md` in the task branch and copy the concise checkpoint into Notion when access returns. Link the PR/commit; never store transcripts or secrets by default.

Sources: [Orca agent handoff](https://orca.dev/docs/agents/codex), [OpenCode config](https://opencode.ai/docs/config/), [OpenCode permissions](https://opencode.ai/docs/permissions/), [Notion MCP setup](https://developers.notion.com/guides/mcp/get-started-with-mcp).
