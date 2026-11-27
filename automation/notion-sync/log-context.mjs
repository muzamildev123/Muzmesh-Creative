#!/usr/bin/env node
// Append one entry to the Notion "Chat log" page, for agents without a Notion connector (Codex, Claude Code).
//
//   node log-context.mjs "<harness>" "<short topic>" "<bullet>" ["<bullet>" ...]
//   node log-context.mjs "Codex" "Hero copy" "Shortened the headline" "Next: check mobile wrap"
//
// Anything that looks like a secret is redacted before upload.

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
const [harness, topic, ...bullets] = process.argv.slice(2);
if (!TOKEN || !PARENT) {
  console.error(`Missing NOTION_TOKEN / NOTION_PARENT_PAGE_ID in ${join(HERE, '.env')}`);
  process.exit(1);
}
if (!harness || !topic || !bullets.length) {
  console.error('Usage: node log-context.mjs "<harness>" "<short topic>" "<bullet>" ["<bullet>" ...]');
  process.exit(1);
}

const redact = (t) =>
  t
    .replace(/\b(sk|pk|rk|ghp|gho|ghs|github_pat|xox[abpr]|ntn|secret|AKIA)[A-Za-z0-9_\-]{12,}/g, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, '[redacted]')
    .replace(/\b[A-Za-z0-9_\-]{40,}\b/g, '[redacted]')
    .replace(/([?&](token|key|secret|password)=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 1900);
const rt = (t) => [{ type: 'text', text: { content: redact(t) } }];

async function notion(method, path, body) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Notion ${method} ${path}: ${res.status} ${json.message}`);
  return json;
}

const kids = await notion('GET', `blocks/${PARENT}/children?page_size=100`);
const chat = kids.results.find((b) => b.type === 'child_page' && b.child_page.title === 'Chat log');
if (!chat) throw new Error('No "Chat log" page under the context page');

const date = new Date().toLocaleDateString('en-CA');
await notion('PATCH', `blocks/${chat.id}/children`, {
  children: [
    { type: 'heading_3', heading_3: { rich_text: rt(`${date} · ${harness} · ${topic}`) } },
    ...bullets.map((b) => ({ type: 'bulleted_list_item', bulleted_list_item: { rich_text: rt(b) } })),
    { type: 'divider', divider: {} },
  ],
});
console.log(`Logged "${topic}" to Chat log`);
