#!/usr/bin/env node
// Sync Muzmesh project context into Notion.
//
// Collects, from this machine:
//   - every git worktree of the repo: branch, ahead/behind main, uncommitted files, recent commits
//   - Claude Code memory files for the Muzmesh projects
//   - Claude Code sessions for the Muzmesh projects: title, last activity, recent prompts (secrets redacted)
// and writes each into its own child page under NOTION_PARENT_PAGE_ID.
// A page is only rewritten when its content changed since the last sync.
//
// Run once:   node automation/notion-sync/sync.mjs
// Scheduled:  automation/notion-sync/install.sh (launchd, every 5 minutes)

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = execFileSync('git', ['-C', HERE, 'rev-parse', '--show-toplevel']).toString().trim();
const STATE_FILE = join(HERE, '.state.json');
const PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const PROJECT_MATCH = process.env.CONTEXT_PROJECT_MATCH || 'Muzmesh';
const COMMITS = 10;
const PROMPTS_PER_SESSION = 8;
const SESSION_DAYS = 14;

loadEnv(join(HERE, '.env'));
const TOKEN = process.env.NOTION_TOKEN;
const PARENT = process.env.NOTION_PARENT_PAGE_ID?.replace(/-/g, '').match(/[0-9a-f]{32}/i)?.[0];
if (!TOKEN || !PARENT) {
  console.error('Set NOTION_TOKEN and NOTION_PARENT_PAGE_ID in automation/notion-sync/.env');
  process.exit(1);
}

// ---------- collect ----------

function git(cwd, ...args) {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function worktrees() {
  const out = git(REPO, 'worktree', 'list', '--porcelain');
  const trees = [];
  let cur = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) trees.push((cur = { path: line.slice(9) }));
    else if (line.startsWith('branch ')) cur.branch = line.slice(7).replace('refs/heads/', '');
  }
  return trees.filter((t) => existsSync(t.path));
}

function worktreeBlocks() {
  const blocks = [];
  for (const t of worktrees()) {
    const branch = t.branch || '(detached)';
    const counts = git(t.path, 'rev-list', '--left-right', '--count', `origin/main...HEAD`).split(/\s+/);
    const dirty = git(t.path, 'status', '--porcelain').split('\n').filter(Boolean);
    const log = git(t.path, 'log', `-${COMMITS}`, '--date=short', '--format=%h %ad %s');
    blocks.push(h2(`${basename(t.path)} — ${branch}`));
    blocks.push(para(`${t.path}`));
    blocks.push(
      bullet(
        counts.length === 2
          ? `${counts[1]} commits ahead, ${counts[0]} behind origin/main`
          : 'No origin/main to compare against',
      ),
    );
    blocks.push(bullet(dirty.length ? `${dirty.length} uncommitted files` : 'Working tree clean'));
    if (dirty.length) blocks.push(code(dirty.slice(0, 40).join('\n')));
    if (log) blocks.push(para('Recent commits'), code(log));
  }
  return blocks;
}

function projectDirs() {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR)
    .filter((d) => d.includes(PROJECT_MATCH))
    .map((d) => join(PROJECTS_DIR, d));
}

function projectLabel(dir) {
  const name = basename(dir);
  const marker = `${PROJECT_MATCH}-Creative-`;
  return name.includes(marker) ? name.split(marker).pop() : `${PROJECT_MATCH}-Creative`;
}

function memoryBlocks() {
  const blocks = [];
  for (const dir of projectDirs()) {
    const mem = join(dir, 'memory');
    if (!existsSync(mem)) continue;
    const files = readdirSync(mem).filter((f) => f.endsWith('.md') && f !== 'MEMORY.md');
    if (!files.length) continue;
    blocks.push(h2(projectLabel(dir)));
    for (const f of files.sort()) {
      const body = redact(readFileSync(join(mem, f), 'utf8').replace(/^---[\s\S]*?---\s*/, ''));
      blocks.push(h3(f.replace(/\.md$/, '')), ...markdownish(body));
    }
  }
  return blocks.length ? blocks : [para('No memory files yet.')];
}

const DESKTOP_DIR = join(homedir(), 'Library', 'Application Support', 'Claude');

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// Files two levels down: <root>/<account>/<org>/<name>
function desktopFiles(sub, test) {
  const root = join(DESKTOP_DIR, sub);
  const out = [];
  if (!existsSync(root)) return out;
  for (const a of readdirSync(root)) {
    const aDir = join(root, a);
    if (!statSync(aDir).isDirectory()) continue;
    for (const o of readdirSync(aDir)) {
      const oDir = join(aDir, o);
      if (!statSync(oDir).isDirectory()) continue;
      for (const f of readdirSync(oDir)) if (test(f)) out.push(join(oDir, f));
    }
  }
  return out;
}

// Session IDs started from the Claude desktop app's Code tab (their transcripts live in ~/.claude/projects).
function desktopCodeSessionIds() {
  const ids = new Set();
  for (const f of desktopFiles('claude-code-sessions', (n) => n.endsWith('.json'))) {
    const d = readJson(f);
    if (d?.cliSessionId) ids.add(d.cliSessionId);
  }
  return ids;
}

// Claude desktop Cowork sessions that mention the project.
function coworkSessions(cutoff) {
  const sessions = [];
  const match = new RegExp(PROJECT_MATCH, 'i');
  for (const f of desktopFiles('local-agent-mode-sessions', (n) => n.startsWith('local_') && n.endsWith('.json'))) {
    const meta = readJson(f);
    if (!meta || Number(meta.lastActivityAt) < cutoff) continue;
    const audit = join(f.replace(/\.json$/, ''), 'audit.jsonl');
    const prompts = [];
    if (existsSync(audit)) {
      for (const line of readFileSync(audit, 'utf8').split('\n')) {
        const d = line && (() => { try { return JSON.parse(line); } catch { return null; } })();
        const c = d?.type === 'user' && d.message?.content;
        if (typeof c === 'string' && !c.startsWith('<')) prompts.push(c);
      }
    }
    const haystack = [meta.title, meta.initialMessage, JSON.stringify(meta.userSelectedFolders), ...prompts].join('\n');
    if (!match.test(haystack)) continue;
    sessions.push({
      harness: 'Desktop Cowork',
      project: 'Cowork',
      title: meta.title || '(untitled)',
      mtime: Number(meta.lastActivityAt),
      prompts: prompts.length ? prompts : [meta.initialMessage || ''],
    });
  }
  return sessions;
}

// Codex sessions (CLI, desktop app, Orca) whose working directory is a project folder.
function codexSessions(cutoff) {
  const root = join(homedir(), '.codex', 'sessions');
  if (!existsSync(root)) return [];
  const titles = new Map();
  const index = join(homedir(), '.codex', 'session_index.jsonl');
  if (existsSync(index)) {
    for (const line of readFileSync(index, 'utf8').split('\n')) {
      try {
        const d = JSON.parse(line);
        if (d.thread_name) titles.set(d.id, d.thread_name);
      } catch {}
    }
  }
  const files = readdirSync(root, { recursive: true })
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => join(root, f));
  const match = new RegExp(PROJECT_MATCH, 'i');
  const sessions = [];
  for (const file of files) {
    const mtime = statSync(file).mtimeMs;
    if (mtime < cutoff) continue;
    let meta = null;
    const prompts = [];
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue;
      let d;
      try {
        d = JSON.parse(line);
      } catch {
        continue;
      }
      const p = d.payload || {};
      if (d.type === 'session_meta') meta = p;
      if (d.type === 'response_item' && p.type === 'message' && p.role === 'user') {
        for (const c of p.content || []) {
          const t = c.type === 'input_text' && typeof c.text === 'string' ? c.text.trim() : '';
          if (t && !t.startsWith('<') && !t.startsWith('# AGENTS.md') && !/^\[Image #\d+\]$/.test(t)) prompts.push(t);
        }
      }
    }
    if (!meta?.cwd || !match.test(meta.cwd) || !prompts.length) continue;
    sessions.push({
      harness: meta.originator === 'orca_desktop' ? 'Codex (Orca)' : 'Codex',
      project: basename(meta.cwd),
      title: titles.get(meta.id) || prompts[0].slice(0, 60),
      mtime,
      prompts,
    });
  }
  return sessions;
}

function sessionBlocks() {
  const cutoff = Date.now() - SESSION_DAYS * 864e5;
  const desktopIds = desktopCodeSessionIds();
  const sessions = [...coworkSessions(cutoff), ...codexSessions(cutoff)];
  for (const dir of projectDirs()) {
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
      const file = join(dir, f);
      const mtime = statSync(file).mtimeMs;
      if (mtime < cutoff) continue;
      let title = '';
      const prompts = [];
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!line) continue;
        let d;
        try {
          d = JSON.parse(line);
        } catch {
          continue;
        }
        if (d.type === 'ai-title' && d.aiTitle) title = d.aiTitle;
        if (
          d.type === 'user' &&
          d.promptSource !== 'sdk' &&
          !d.isMeta &&
          typeof d.message?.content === 'string' &&
          !d.message.content.startsWith('<')
        ) {
          prompts.push(d.message.content);
        }
      }
      if (!title && !prompts.length) continue;
      sessions.push({
        harness: desktopIds.has(f.replace(/\.jsonl$/, '')) ? 'Desktop Code' : 'Claude Code CLI',
        project: projectLabel(dir),
        title: title || '(untitled)',
        mtime,
        prompts,
      });
    }
  }
  sessions.sort((a, b) => b.mtime - a.mtime);
  const blocks = [];
  for (const s of sessions) {
    blocks.push(h3(`${s.title} · ${s.harness} · ${s.project} · ${new Date(s.mtime).toLocaleString('en-GB', { hour12: false, dateStyle: 'short', timeStyle: 'short' })}`));
    const recent = [...new Set(s.prompts)].slice(-PROMPTS_PER_SESSION);
    for (const p of recent) blocks.push(bullet(redact(p).slice(0, 500)));
  }
  return blocks.length ? blocks : [para(`No sessions in the last ${SESSION_DAYS} days.`)];
}

// Strip anything that looks like a credential before it leaves the machine.
function redact(text) {
  return text
    .replace(/\b(sk|pk|rk|ghp|gho|ghs|github_pat|xox[abpr]|ntn|secret|AKIA)[A-Za-z0-9_\-]{12,}/g, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_\-]{40,}\b/g, '[redacted]')
    .replace(/([?&](token|key|secret|password)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]');
}

// ---------- notion blocks ----------

const MAX = 1900;
function rich(text) {
  const parts = [];
  for (let i = 0; i < Math.max(text.length, 1); i += MAX) parts.push({ type: 'text', text: { content: text.slice(i, i + MAX) } });
  return parts.slice(0, 50);
}
const h2 = (t) => ({ type: 'heading_2', heading_2: { rich_text: rich(t) } });
const h3 = (t) => ({ type: 'heading_3', heading_3: { rich_text: rich(t) } });
const para = (t) => ({ type: 'paragraph', paragraph: { rich_text: rich(t) } });
const bullet = (t) => ({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: rich(t) } });
const code = (t) => ({ type: 'code', code: { language: 'plain text', rich_text: rich(t) } });

function markdownish(md) {
  return md
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk) =>
      chunk.split('\n').every((l) => /^\s*[-*] /.test(l))
        ? chunk.split('\n').map((l) => bullet(l.replace(/^\s*[-*] /, '')))
        : [para(chunk)],
    );
}

// ---------- notion api ----------

async function notion(method, path, body, attempt = 0) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return notion(method, path, body, attempt + 1);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${json.message}`);
  return json;
}

async function ensurePage(state, key, title) {
  if (state.pages[key]) {
    try {
      const p = await notion('GET', `pages/${state.pages[key]}`);
      if (!p.archived && !p.in_trash) return state.pages[key];
    } catch {}
  }
  const page = await notion('POST', 'pages', {
    parent: { page_id: PARENT },
    properties: { title: { title: rich(title) } },
  });
  state.pages[key] = page.id;
  state.hashes[key] = null;
  return page.id;
}

async function replaceChildren(pageId, blocks) {
  let cursor;
  const old = [];
  do {
    const r = await notion('GET', `blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    old.push(...r.results.map((b) => b.id));
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  for (const id of old) await notion('DELETE', `blocks/${id}`);
  for (let i = 0; i < blocks.length; i += 100) {
    await notion('PATCH', `blocks/${pageId}/children`, { children: blocks.slice(i, i + 100) });
  }
}

// ---------- main ----------

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  const state = existsSync(STATE_FILE)
    ? JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    : { pages: {}, hashes: {} };
  const sections = [
    ['worktrees', 'Worktrees & git', worktreeBlocks],
    ['memory', 'Claude memory', memoryBlocks],
    ['sessions', 'Claude sessions', sessionBlocks],
  ];
  const stamp = new Date().toLocaleString('en-GB', { hour12: false });
  const changed = [];
  for (const [key, title, collect] of sections) {
    const blocks = collect();
    const hash = createHash('sha256').update(JSON.stringify(blocks)).digest('hex');
    const pageId = await ensurePage(state, key, title);
    if (state.hashes[key] === hash) continue;
    await replaceChildren(pageId, [para(`Synced ${stamp} from ${REPO}`), ...blocks]);
    state.hashes[key] = hash;
    changed.push(title);
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`[${stamp}] ${changed.length ? `updated: ${changed.join(', ')}` : 'no changes'}`);
}

main().catch((e) => {
  console.error(`[${new Date().toISOString()}] sync failed: ${e.message}`);
  process.exit(1);
});
