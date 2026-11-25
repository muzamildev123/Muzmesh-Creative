// Live text for the Studio preview (/preview only).
//
// The Studio sends the Homepage document to the page on every keystroke (see
// PreviewEditing.tsx). This file finds the texts on the page that came from the
// fields that changed and rewrites them in place, so an edit in the panel shows on
// the page straight away: no server render, no page reload, and the scroll story's
// own state (which a reload or a whole-page swap would reset) is left alone.
//
// Each text on the page carries an invisible marker naming its field (the same marker
// that makes click-to-edit work). A text is shown either as typed (plain) or through
// `rich()` (bold, `code` and {price} tokens). Anything else, such as a list getting a new
// item or a price changing, falls back to one quiet page reload after typing stops.
import { VERCEL_STEGA_REGEX, vercelStegaDecode } from '@vercel/stega';
import { mergeHome, plain, rich, tokens } from '@/lib/home';

type Doc = Record<string, unknown>;
type Run = { path: string; from: number; end: number; enc: string };

const DOC_ID = 'homePage';
const INVISIBLE = /[​‌‍⁠﻿]/;
// Fields that never show on the page, so a change to them needs nothing.
const OFF_PAGE = /^(seo\.|_)/;

/** Every string in the document by its Studio path, such as `faq.groups[_key=="a"].title`. */
function strings(value: unknown, path = '', out = new Map<string, string>()) {
  if (typeof value === 'string') out.set(path, value);
  else if (Array.isArray(value))
    value.forEach((item, i) => {
      const key = item && typeof item === 'object' && typeof (item as Doc)._key === 'string' ? `[_key=="${(item as Doc)._key}"]` : `[${i}]`;
      strings(item, path + key, out);
    });
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) if (!k.startsWith('_')) strings(v, path ? `${path}.${k}` : k, out);
  return out;
}

/**
 * The document's shape: everything except the words. When this changes (an item added,
 * removed or moved, a price changed, a text emptied so the default shows), the page is
 * rebuilt by the server instead of patched here.
 */
const shapeOf = (doc: Doc) =>
  JSON.stringify(doc, (k, v) => {
    if (k !== '_key' && k.startsWith('_')) return undefined;
    if (typeof v === 'string' && k !== '_key') return v.trim() ? 1 : 0;
    return v;
  });

const pathCache = new Map<string, string | null>();
/** The Homepage field an invisible marker points at, or null. */
function pathOf(enc: string): string | null {
  let path = pathCache.get(enc);
  if (path !== undefined) return path;
  path = null;
  try {
    const href = decodeURIComponent(vercelStegaDecode<{ href?: string }>(enc)?.href ?? '');
    const m = href.match(/;id=([^;]+);type=[^;]+;path=([^?]+)/);
    if (m && m[1].replace(/^drafts\./, '') === DOC_ID) path = m[2];
  } catch {
    // Not a marker of ours.
  }
  pathCache.set(enc, path);
  return path;
}

function runsIn(text: string): Run[] {
  const runs: Run[] = [];
  const re = new RegExp(VERCEL_STEGA_REGEX.source, 'gu');
  let from = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const path = pathOf(m[0]);
    if (path) runs.push({ path, from, end: m.index, enc: m[0] });
    from = m.index + m[0].length;
  }
  return runs;
}

/**
 * Rewrites the runs whose field changed, as typed or through `plain()` (the FAQ questions).
 * Returns the new text, and the runs it couldn't place.
 */
function patchText(text: string, runs: Run[], prev: Map<string, string>, next: Map<string, string>, t: Record<string, string>) {
  const missed: Run[] = [];
  let out = text;
  // Right to left, so earlier offsets stay valid.
  for (const run of [...runs].reverse()) {
    const before = prev.get(run.path);
    const after = next.get(run.path);
    if (after === undefined || before === undefined || after === before) continue;
    const shown = text.slice(run.from, run.end);
    let placed = false;
    for (const show of [(s: string) => s, (s: string) => plain(s, t)]) {
      const was = show(before);
      const now = show(after);
      const showsNow = !!now && shown.endsWith(now);
      const showsWas = !!was && shown.endsWith(was);
      // When both match, one is a tail of the other ("aunch" and "Launch"): the longer one is on screen.
      if (showsNow && (!showsWas || now.length >= was.length)) placed = true; // already showing it (typed on the page itself)
      else if (showsWas) {
        out = out.slice(0, run.end - was.length) + now + out.slice(run.end);
        placed = true;
      }
      if (placed) break;
    }
    if (!placed) missed.push(run);
  }
  return { text: out, missed };
}

const template = document.createElement('template');
const asDom = (html: string) => ((template.innerHTML = html), template.innerHTML);

export interface LivePatcher {
  /** Show this version of the Homepage document. Returns false when only a reload can show it. */
  update(doc: Doc): boolean;
  /** Whether a document has arrived from the Studio, so edits are being shown live. */
  readonly live: boolean;
}

export function createLivePatcher(): LivePatcher {
  let prevDoc: Doc | undefined;
  let prevStrings = new Map<string, string>();
  let prevShape = '';
  let live = false;

  function apply(next: Map<string, string>, t: Record<string, string>): boolean {
    const onPage = new Set<string>();
    let ok = true;
    const skip = (el: Element | null) => !el || !!el.closest('sanity-visual-editing, [contenteditable]');

    // Text on the page.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (INVISIBLE.test((n as Text).data)) nodes.push(n as Text);
    const richDone = new Set<Element>();
    // The launch brief's promise also fills {startup} (see LaunchBrief.astro).
    const richTokens = [t, { ...t, startup: '<b class="lc-nm">your startup</b>' }];
    for (const node of nodes) {
      if (skip(node.parentElement)) continue;
      const runs = runsIn(node.data);
      runs.forEach((r) => onPage.add(r.path));
      const { text, missed } = patchText(node.data, runs, prevStrings, next, t);
      if (text !== node.data) node.data = text;
      // Not shown as typed: try the `rich()` formatting (bold, code, {tokens}) on its element.
      for (const run of missed) {
        const before = prevStrings.get(run.path)! + run.enc;
        const after = next.get(run.path)! + run.enc;
        let placed = false;
        for (const tokenSet of richTokens) {
          const was = asDom(rich(before, tokenSet));
          const now = asDom(rich(after, tokenSet));
          let el: Element | null = node.parentElement;
          for (let up = 0; el && up < 3 && !placed; up++, el = el.parentElement) {
            if (richDone.has(el) || el.innerHTML === now) placed = true;
            else if (el.innerHTML === was) {
              el.innerHTML = now;
              richDone.add(el);
              placed = true;
            }
          }
          if (placed) break;
        }
        if (!placed) ok = false;
      }
    }

    // Text in attributes, such as the idea box's placeholder.
    for (const el of document.body.querySelectorAll('*')) {
      if (skip(el)) continue;
      for (const attr of el.attributes) {
        if (!INVISIBLE.test(attr.value)) continue;
        const runs = runsIn(attr.value);
        runs.forEach((r) => onPage.add(r.path));
        const { text, missed } = patchText(attr.value, runs, prevStrings, next, t);
        if (text !== attr.value) el.setAttribute(attr.name, text);
        if (missed.length) ok = false;
      }
    }

    // A changed field the page shows without a marker (an email link, say): let the server render it.
    for (const [path, value] of next)
      if (prevStrings.get(path) !== value && !onPage.has(path) && !OFF_PAGE.test(path)) ok = false;
    return ok;
  }

  return {
    get live() {
      return live;
    },
    update(doc) {
      live = true;
      const next = strings(doc);
      const shape = shapeOf(doc);
      if (!prevDoc) {
        // The page was rendered from this version.
        prevDoc = doc;
        prevStrings = next;
        prevShape = shape;
        return true;
      }
      const ok = shape === prevShape && apply(next, tokens(mergeHome(doc)));
      prevDoc = doc;
      prevStrings = next;
      prevShape = shape;
      return ok;
    },
  };
}
