// Everything the Studio's Presentation tab needs on /preview: the click-to-edit overlay,
// live text while typing in the panel, and double-click editing on the page (InlineEdit).
//
// How an edit in the panel reaches the page: the Studio runs the Homepage query against
// the form you are typing in and sends the result here on every keystroke
// (usePresentationQuery). live.ts rewrites just the texts that changed. There is no server
// render and no page reload, so the update is immediate and the overlay doesn't flash.
// Only edits a text patch can't show (a list item added, removed or moved) reload the page, once,
// after typing stops.
import { useCallback, useEffect, useState } from 'react';
import { VisualEditing, usePresentationQuery, type HistoryAdapter, type HistoryAdapterNavigate, type HistoryRefresh } from '@sanity/visual-editing/react';
import InlineEdit from './InlineEdit';
import { createLivePatcher } from '@/preview/live';

const QUERY = '*[_id == "homePage"][0]';
const RELOAD_AFTER_MS = 1200;

/** Keeps the Studio's address bar in step with the preview, and follows its navigation. */
function createHistory(): HistoryAdapter & { dispose(): void } {
  let navigate: HistoryAdapterNavigate | undefined;
  const here = () => `${location.pathname}${location.search}${location.hash}`;
  const report = () => navigate?.({ type: 'push', title: document.title, url: here() });
  addEventListener('popstate', report);
  addEventListener('hashchange', report);
  return {
    subscribe(next) {
      navigate = next;
      report();
      return () => {
        if (navigate === next) navigate = undefined;
      };
    },
    update(u) {
      if (u.type === 'pop') return history.back();
      if (new URL(u.url, location.href).href === location.href) return;
      if (u.type === 'replace') location.replace(u.url);
      else location.assign(u.url);
    },
    dispose() {
      removeEventListener('popstate', report);
      removeEventListener('hashchange', report);
    },
  };
}

let reloadTimer = 0;
/** One reload once edits stop for a moment, instead of one per keystroke. */
function reloadSoon() {
  window.clearTimeout(reloadTimer);
  reloadTimer = window.setTimeout(() => window.location.reload(), RELOAD_AFTER_MS);
}

export default function PreviewEditing() {
  const [patcher] = useState(createLivePatcher);
  const [history] = useState(createHistory);
  useEffect(() => () => history.dispose(), [history]);
  const { data } = usePresentationQuery({ query: QUERY, stega: false });

  useEffect(() => {
    if (data && typeof data === 'object' && !patcher.update(data as Record<string, unknown>)) reloadSoon();
  }, [data, patcher]);

  // Presentation asks for a refresh after each saved change. The live query has already
  // shown it, so nothing to do; without the live query (an older Studio), reload once.
  const refresh = useCallback(
    (payload: HistoryRefresh) => {
      if (payload.source === 'manual') {
        window.setTimeout(() => window.location.reload(), 0);
        return Promise.resolve();
      }
      if (payload.source === 'mutation') {
        if (!patcher.live) reloadSoon();
        return Promise.resolve();
      }
      return false as const;
    },
    [patcher],
  );

  return (
    <>
      <VisualEditing portal history={history} refresh={refresh} />
      <InlineEdit />
    </>
  );
}
