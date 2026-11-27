#!/usr/bin/env node
// Print the shared Muzmesh context from Notion as plain text, for any agent (Claude Code, Codex, ...).
//
//   node read-context.mjs            # Chat log (decisions from Claude chats on desktop / browser)
//   node read-context.mjs memory     # one page: chat | memory | sessions | worktrees
//   node read-context.mjs all        # everything
//
// Read-only. Uses NOTION_TOKEN from .env next to this file.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  (existsSync(join(HERE, '.env')) ? readFileSync(join(HERE, '.env'), 'utf8') : '')
    .split('\n')
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const TOKEN = process.env.NOTION_TOKEN || env.NOTION_TOKEN;
const PARENT = (process.env.NOTION_PARENT_PAGE_ID || env.NOTION_PARENT_PAGE_ID || '').replace(/-/g, '');
if (!TOKEN || !PARENT) {
  console.error(`Missing NOTION_TOKEN / NOTION_PARENT_PAGE_ID in ${join(HERE, '.env')}`);
  process.exit(1);
}

const PAGES = { chat: 'Chat log', memory: 'Claude memory', sessions: 'Claude sessions', worktrees: 'Worktrees & git' };
const want = (process.argv[2] || 'chat').toLowerCase();
if (want !== 'all' && !PAGES[want]) {
  console.error(`Unknown page "${want}". Use one of: ${Object.keys(PAGES).join(', ')}, all`);
  process.exit(1);
}

async function children(id) {
  const out = [];
  let cursor;
  do {
    const res = await fetch(
      `https://api.notion.com/v1/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`,
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28' } },
    );
    const json = await res.json();
    if (!res.ok) throw new Error(`Notion: ${res.status} ${json.message}`);
    out.push(...json.results);
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);
  return out;
}

const PREFIX = {
  heading_1: '# ', heading_2: '## ', heading_3: '### ',
  bulleted_list_item: '- ', numbered_list_item: '1. ', to_do: '- [ ] ', quote: '> ',
};

async function render(id, depth = 0) {
  const lines = [];
  for (const b of await children(id)) {
    if (b.type === 'child_page' || b.type === 'child_database') continue;
    const data = b[b.type] || {};
    const text = (data.rich_text || []).map((r) => r.plain_text).join('');
    const pad = '  '.repeat(depth);
    if (b.type === 'code') lines.push('```', text, '```');
    else if (b.type === 'divider') lines.push('---');
    else if (text) lines.push(pad + (PREFIX[b.type] || '') + text);
    if (b.has_children) lines.push(...(await render(b.id, depth + 1)));
  }
  return lines;
}

const pages = (await children(PARENT)).filter((b) => b.type === 'child_page');
for (const [key, title] of Object.entries(PAGES)) {
  if (want !== 'all' && want !== key) continue;
  const page = pages.find((p) => p.child_page.title === title);
  if (!page) {
    console.log(`(no "${title}" page found)\n`);
    continue;
  }
  console.log(`===== ${title} =====\n${(await render(page.id)).join('\n')}\n`);
}
