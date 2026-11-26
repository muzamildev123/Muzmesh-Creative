#!/usr/bin/env node
// Content changelog for Sanity: what changed, and what is on staging but not live yet.
//
// Staging (staging.muzmeshcreative.com) shows Sanity drafts; the live site shows
// published documents. So "on staging, not live" = every document with a draft.
//
//   node scripts/content-changelog.mjs --now
//       Prints what is waiting to go live right now. Quick check, writes nothing.
//
//   node scripts/content-changelog.mjs --dir <folder>
//       Compares Sanity with the snapshot in <folder>, adds an entry to
//       <folder>/CHANGELOG.md, and saves the new snapshot. The GitHub Action
//       "Content changelog" runs this every 15 minutes on the `content-log` branch.
//
// Needs SANITY_READ_TOKEN (sanity.io/manage -> API -> Tokens, role Viewer): drafts
// are never public. SANITY_PROJECT_ID / SANITY_DATASET default to this site's.
// No dependencies: Node 20+.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PROJECT = process.env.SANITY_PROJECT_ID || 'gly807qe';
const DATASET = process.env.SANITY_DATASET || 'production';
const TOKEN = process.env.SANITY_READ_TOKEN;
const API = `https://${PROJECT}.api.sanity.io/v2026-10-01`;
const TZ = 'Asia/Karachi';
const MAX_ENTRIES = 300; // older entries stay in git history

const args = process.argv.slice(2);
const dirArg = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : undefined;
if (!args.includes('--now') && !dirArg) {
  console.error('Usage: content-changelog.mjs --now | --dir <folder>');
  process.exit(2);
}
if (!TOKEN) console.warn('SANITY_READ_TOKEN is not set: only published content is visible, drafts are not.');

const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

async function getJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url.split('?')[0]}\n${await res.text()}`);
  return res.json();
}

// --- Sanity -> { published: {id: doc}, drafts: {id: doc} } -------------------

async function fetchContent() {
  const query = '*[!(_id in path("_.**")) && !(_type match "sanity.*") && !(_id in path("versions.**"))]';
  const { result } = await getJson(`${API}/data/query/${DATASET}?perspective=raw&query=${encodeURIComponent(query)}`);
  const published = {};
  const drafts = {};
  for (const doc of result) {
    if (doc._id.startsWith('drafts.')) drafts[doc._id.slice(7)] = doc;
    else published[doc._id] = doc;
  }
  return { published, drafts };
}

// --- Flatten a document to { idPath: { label, value } } ----------------------
// idPath uses array _keys so items keep their identity when reordered;
// label uses positions (#1, #2) and readable names for people.

const SKIP = new Set(['_id', '_rev', '_type', '_createdAt', '_updatedAt', '_key', '_system']);
const human = (k) => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

function blockText(block) {
  return (block.children || []).map((c) => c.text || '').join('');
}

function flatten(value, idPath = '', label = '', out = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      const id = item && typeof item === 'object' && item._key ? item._key : String(i);
      flatten(item, `${idPath}[${id}]`, `${label} #${i + 1}`, out);
    });
    if (!value.length) out[idPath] = { label, value: '(empty list)' };
  } else if (value && typeof value === 'object') {
    if (value._type === 'block') out[idPath] = { label, value: blockText(value) };
    else if (value._type === 'slug') out[idPath] = { label, value: value.current };
    else if (value._type === 'reference' || value._ref) out[idPath] = { label, value: `→ ${value._ref}` };
    else if (value.asset?._ref) {
      out[idPath] = { label, value: `image ${value.asset._ref}` };
      if (value.alt) out[`${idPath}.alt`] = { label: `${label} › Alt`, value: value.alt };
    } else {
      for (const [k, v] of Object.entries(value)) {
        if (SKIP.has(k)) continue;
        flatten(v, idPath ? `${idPath}.${k}` : k, label ? `${label} › ${human(k)}` : human(k), out);
      }
    }
  } else if (value !== null && value !== undefined && value !== '') {
    out[idPath] = { label, value };
  }
  return out;
}

function docTitle(id, doc) {
  if (id === 'homePage') return 'Homepage';
  const name = doc?.title || doc?.name || doc?.slug?.current;
  const type = { post: 'Blog post', caseStudy: 'Project', author: 'Author' }[doc?._type] || human(doc?._type || 'Document');
  return name ? `${type} “${name}”` : `${type} ${id}`;
}

const show = (v) => {
  if (v === undefined) return '(empty)';
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : JSON.stringify(v);
  return `“${s.length > 140 ? s.slice(0, 137) + '…' : s}”`;
};

// Field-level differences between two versions of a document, as Markdown bullets.
function fieldChanges(before, after) {
  const a = flatten(before || {});
  const b = flatten(after || {});
  const lines = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key]?.value;
    const y = b[key]?.value;
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    const label = (b[key] || a[key]).label;
    if (x === undefined) lines.push(`${label}: added ${show(y)}`);
    else if (y === undefined) lines.push(`${label}: removed (was ${show(x)})`);
    else if (show(x) === show(y)) lines.push(`${label}: only spaces or line breaks changed in ${show(y)}`);
    else lines.push(`${label}: ${show(x)} → ${show(y)}`);
  }
  return lines;
}

// --- Who made the changes (best effort; the log works without it) ----------

async function authorsSince(ids, since) {
  if (!TOKEN || !ids.length) return '';
  try {
    const all = ids.flatMap((id) => [id, `drafts.${id}`]).join(',');
    const url = `https://${PROJECT}.api.sanity.io/v2021-06-07/data/history/${DATASET}/transactions/${all}?excludeContent=true${since ? `&fromTime=${since}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return '';
    const userIds = [...new Set((await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l).author).filter(Boolean))];
    if (!userIds.length) return '';
    const names = await Promise.all(
      userIds.map(async (u) => {
        try {
          const r = await fetch(`https://api.sanity.io/v2021-06-07/projects/${PROJECT}/users/${u}`, { headers });
          const j = r.ok ? await r.json() : null;
          return (Array.isArray(j) ? j[0] : j)?.displayName || u;
        } catch {
          return u;
        }
      }),
    );
    return names.join(', ');
  } catch {
    return '';
  }
}

// --- What is on staging but not live right now -------------------------------

function pending({ published, drafts }) {
  const sections = [];
  for (const [id, draft] of Object.entries(drafts)) {
    const lines = fieldChanges(published[id], draft);
    if (!lines.length) continue;
    const title = docTitle(id, draft) + (published[id] ? '' : ' (new, never published)');
    sections.push(`### ${title}\nDraft saved ${when(draft._updatedAt)}\n\n${lines.map((l) => `- ${l}`).join('\n')}`);
  }
  return sections.length
    ? sections.join('\n\n')
    : 'Nothing. Staging and live show the same content.';
}

const when = (iso) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' PKT';

// --- Snapshot on disk: snapshot/published/<id>.json, snapshot/drafts/<id>.json --

async function readSnapshot(dir) {
  const read = async (sub) => {
    const folder = path.join(dir, 'snapshot', sub);
    const out = {};
    let files = [];
    try {
      files = await readdir(folder);
    } catch {
      return null;
    }
    for (const f of files.filter((f) => f.endsWith('.json'))) out[f.slice(0, -5)] = JSON.parse(await readFile(path.join(folder, f), 'utf8'));
    return out;
  };
  const published = await read('published');
  if (!published) return null;
  return { published, drafts: (await read('drafts')) || {} };
}

const sortKeys = (v) =>
  Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

async function writeSnapshot(dir, content) {
  for (const sub of ['published', 'drafts']) {
    const folder = path.join(dir, 'snapshot', sub);
    await rm(folder, { recursive: true, force: true });
    await mkdir(folder, { recursive: true });
    for (const [id, doc] of Object.entries(content[sub])) {
      await writeFile(path.join(folder, `${id.replace(/[^\w.-]/g, '_')}.json`), JSON.stringify(sortKeys(doc), null, 2) + '\n');
    }
  }
}

// --- What changed since the last snapshot ------------------------------------

function changesSince(prev, next) {
  const live = [];
  const staging = [];
  const ids = new Set([...Object.keys(prev.published), ...Object.keys(next.published), ...Object.keys(prev.drafts), ...Object.keys(next.drafts)]);
  for (const id of ids) {
    const pubLines = fieldChanges(prev.published[id], next.published[id]);
    const title = docTitle(id, next.published[id] || next.drafts[id] || prev.published[id] || prev.drafts[id]);
    if (pubLines.length) {
      const verb = !prev.published[id] ? 'published for the first time' : !next.published[id] ? 'unpublished / deleted' : 'published';
      live.push(`**${title}** ${verb}\n${pubLines.map((l) => `- ${l}`).join('\n')}`);
    }
    const hadDraft = !!prev.drafts[id];
    const hasDraft = !!next.drafts[id];
    if (hasDraft) {
      // Compare the draft with what staging showed before: the old draft, or the published version.
      const lines = fieldChanges(prev.drafts[id] || prev.published[id], next.drafts[id]);
      if (lines.length) staging.push(`**${title}** draft edited\n${lines.map((l) => `- ${l}`).join('\n')}`);
    } else if (hadDraft && !pubLines.length) {
      staging.push(`**${title}** draft discarded (staging goes back to the live version)`);
    }
  }
  return { live, staging };
}

// --- Main --------------------------------------------------------------------

const content = await fetchContent();

if (args.includes('--now')) {
  console.log(`# On staging, not live yet\n\n${pending(content)}\n`);
  process.exit(0);
}

const dir = path.resolve(dirArg);
await mkdir(dir, { recursive: true });
const prev = await readSnapshot(dir);
const logPath = path.join(dir, 'CHANGELOG.md');
let entries = '';
try {
  entries = (await readFile(logPath, 'utf8')).split('\n## Changes\n')[1] || '';
} catch {}

const now = new Date().toISOString();
let lastRun = null;
try {
  lastRun = (await readFile(path.join(dir, 'snapshot', 'last-run.txt'), 'utf8')).trim();
} catch {}

let entry = '';
if (!prev) {
  entry = `### ${when(now)}\nStarted the log. Everything in Sanity at this moment is the starting point.\n`;
} else {
  const { live, staging } = changesSince(prev, content);
  if (live.length || staging.length) {
    const changedIds = [...new Set([...Object.keys(content.published), ...Object.keys(content.drafts), ...Object.keys(prev.published), ...Object.keys(prev.drafts)])];
    const by = await authorsSince(changedIds, lastRun);
    entry = `### ${when(now)}${by ? ` · by ${by}` : ''}\n`;
    if (live.length) entry += `\n**Live site** (muzmeshcreative.com)\n\n${live.join('\n\n')}\n`;
    if (staging.length) entry += `\n**Staging** (drafts; on staging.muzmeshcreative.com after “Publish to staging”)\n\n${staging.join('\n\n')}\n`;
  }
}

if (!entry && prev) {
  console.log('No content changes since the last run.');
  process.exit(0);
}

const kept = entries.split(/\n(?=### )/).filter((e) => e.trim()).slice(0, MAX_ENTRIES - 1);
const log = `# Sanity content changelog

Written automatically every 15 minutes by the “Content changelog” GitHub Action.
Newest first. Times are Pakistan time. Older entries: \`git log\` on this branch.

## On staging, not live yet

_As of ${when(now)}_

${pending(content)}

## Changes
${[entry.trim(), ...kept.map((e) => e.trim())].map((e) => `\n${e}\n`).join('')}`;

await writeFile(logPath, log);
await writeSnapshot(dir, content);
await writeFile(path.join(dir, 'snapshot', 'last-run.txt'), now + '\n');
console.log(entry);
