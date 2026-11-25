// Double-click a text on the staging preview and type, like Webflow.
//
// Only loaded on the /preview page, inside the Studio's Presentation tool. Nothing is written
// from here directly: the edit is handed to the Studio (over the Presentation connection), which
// saves it as a draft with the logged-in editor's own permissions. Outside the Studio nothing
// happens, so there is no way for an anonymous visitor to change content.
import { useEffect, useRef } from 'react';
import { useDocuments } from '@sanity/visual-editing/react';
import { at, set } from '@sanity/mutate';
import { vercelStegaDecode, vercelStegaSplit } from '@vercel/stega';

const INVISIBLE = /[​-‍⁠﻿]/;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

type Target = { id: string; type: string; path: string };

/** The field a text came from, read from the invisible marker on the text. */
function fieldOf(text: string): Target | null {
  if (!INVISIBLE.test(text)) return null;
  try {
    const d = vercelStegaDecode<{ href?: string }>(text);
    const href = d?.href ? decodeURIComponent(d.href) : '';
    const m = href.match(/;id=([^;]+);type=([^;]+);path=([^?]+)/);
    return m ? { id: m[1], type: m[2], path: m[3] } : null;
  } catch {
    return null;
  }
}

/** Value at a Sanity path such as `hero.ideas[0]` or `faq.groups[_key=="a"].items[1].question`. */
function valueAt(doc: unknown, path: string): unknown {
  const tokens = path.match(/[^.[\]]+|\[[^\]]+\]/g) ?? [];
  let cur: any = doc;
  for (const tok of tokens) {
    if (cur == null) return undefined;
    if (tok.startsWith('[')) {
      const inner = tok.slice(1, -1);
      const key = inner.match(/^_key\s*==\s*"(.*)"$/);
      if (key) cur = Array.isArray(cur) ? cur.find((x) => x?._key === key[1]) : undefined;
      else cur = Array.isArray(cur) ? cur[Number(inner)] : undefined;
    } else cur = cur[tok];
  }
  return cur;
}

/** The text under the pointer, looking through the Studio's blue overlay. */
function textNodeAt(x: number, y: number): Text | null {
  const overlay = document.querySelector<HTMLElement>('sanity-visual-editing');
  const before = overlay?.style.pointerEvents ?? '';
  if (overlay) overlay.style.pointerEvents = 'none';
  try {
    const doc = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const node = doc.caretPositionFromPoint?.(x, y)?.offsetNode ?? doc.caretRangeFromPoint?.(x, y)?.startContainer;
    return node && node.nodeType === Node.TEXT_NODE ? (node as Text) : null;
  } finally {
    if (overlay) overlay.style.pointerEvents = before;
  }
}

export default function InlineEdit() {
  const { getDocument } = useDocuments();
  const busy = useRef(false);
  const getDocumentRef = useRef(getDocument);
  getDocumentRef.current = getDocument;

  useEffect(() => {
    const note = document.createElement('div');
    note.setAttribute('role', 'status');
    note.style.cssText =
      'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;padding:10px 16px;border-radius:10px;background:#111;color:#fff;font:500 14px/1.3 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);display:none;max-width:90vw;text-align:center';
    document.body.appendChild(note);
    let hide = 0;
    const toast = (msg: string) => {
      note.textContent = msg;
      note.style.display = 'block';
      window.clearTimeout(hide);
      hide = window.setTimeout(() => (note.style.display = 'none'), 4000);
    };

    async function onDblClick(e: MouseEvent) {
      if (busy.current || e.button !== 0) return;
      const node = textNodeAt(e.clientX, e.clientY);
      if (!node || !node.parentElement || node.parentElement.closest('[contenteditable]')) return;
      const target = fieldOf(node.data);
      if (!target) return;
      busy.current = true;
      try {
        const shown = vercelStegaSplit(node.data).cleaned;
        const doc = await getDocumentRef.current(target.id).getSnapshot();
        const raw = valueAt(doc, target.path);
        // Only plain text can be edited here. Text with prices, bold or other formatting in it
        // differs from what is stored, so it is edited in the panel next to the page instead.
        if (typeof raw !== 'string' || norm(raw) !== norm(shown)) {
          toast('This text has a price or formatting in it. Edit it in the panel on the right.');
          return;
        }
        edit(node, target, raw);
      } catch {
        toast('Could not open this text for editing. Use the panel on the right.');
      } finally {
        busy.current = false;
      }
    }

    function edit(node: Text, target: Target, original: string) {
      const marked = node.data;
      const span = document.createElement('span');
      span.contentEditable = 'plaintext-only';
      span.spellcheck = true;
      span.textContent = original;
      span.style.cssText = 'outline:2px solid #4f6cff;outline-offset:3px;border-radius:2px;cursor:text;white-space:pre-wrap';
      node.replaceWith(span);
      span.focus();
      const sel = window.getSelection();
      sel?.selectAllChildren(span);

      let done = false;
      const finish = (save: boolean) => {
        if (done) return;
        done = true;
        const next = (span.textContent ?? '').replace(/ /g, ' ');
        const changed = save && next.trim() !== '' && next !== original;
        const text = document.createTextNode(changed ? next : marked);
        span.replaceWith(text);
        if (!changed) return;
        try {
          getDocumentRef.current(target.id).patch([at(target.path as never, set(next))], { commit: true });
          toast('Saved as a draft.');
        } catch {
          text.data = marked;
          toast('Could not save this change. Use the panel on the right.');
        }
      };
      span.addEventListener('blur', () => finish(true));
      span.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          finish(false);
        } else if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault();
          span.blur();
        }
      });
    }

    document.addEventListener('dblclick', onDblClick, true);
    return () => {
      document.removeEventListener('dblclick', onDblClick, true);
      note.remove();
    };
  }, []);

  return null;
}
