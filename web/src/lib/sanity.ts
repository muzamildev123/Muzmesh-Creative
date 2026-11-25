import { createClient, type SanityClient } from '@sanity/client';
import { vercelStegaCombine, vercelStegaDecode, vercelStegaSplit } from '@vercel/stega';
import { createImageUrlBuilder } from '@sanity/image-url';
import { toHTML, uriLooksSafe, escapeHTML } from '@portabletext/to-html';
import type { Loader } from 'astro/loaders';

// Content is read at build time only. Publishing in the Studio triggers a
// Vercel deploy hook, which rebuilds the site with the new content.
let client: SanityClient | undefined;

// Our own names first; the SANITY_API_* names are the ones the Sanity
// integration on Vercel sets, so either way of connecting works.
export const sanityProjectId = () => import.meta.env.SANITY_PROJECT_ID || import.meta.env.SANITY_API_PROJECT_ID;
const sanityDataset = () => import.meta.env.SANITY_DATASET || import.meta.env.SANITY_API_DATASET || 'production';

// The staging site (staging branch on Vercel) sets SANITY_PERSPECTIVE=drafts, so
// it is built from unpublished drafts. The live site leaves it unset and only
// ever shows published content.
const showDrafts = () => import.meta.env.SANITY_PERSPECTIVE === 'drafts';

export function sanityClient() {
  const projectId = sanityProjectId();
  if (showDrafts() && !import.meta.env.SANITY_API_READ_TOKEN) {
    throw new Error('SANITY_PERSPECTIVE=drafts needs SANITY_API_READ_TOKEN, because drafts are private.');
  }
  if (!projectId) {
    throw new Error('SANITY_PROJECT_ID is not set. Copy web/.env.example to web/.env and fill it in (see README).');
  }
  client ??= createClient({
    projectId,
    dataset: sanityDataset(),
    // Only used at build time, never sent to the browser. Lets the build read a private dataset.
    token: import.meta.env.SANITY_API_READ_TOKEN || undefined,
    apiVersion: '2026-10-01',
    // Skip the CDN so a rebuild right after Publish never gets stale content.
    useCdn: false,
    perspective: showDrafts() ? 'drafts' : 'published',
  });
  return client;
}

// ---------- Visual editing (preview deployment only) ----------
// On the preview deployment (PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true) the
// homepage is rendered on demand from DRAFT content, with invisible "stega"
// markers on each text so the Studio's Presentation tool can click-to-edit.
// The live site never sets this flag, so it stays fully static.
export const visualEditingEnabled = import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === 'true';

/** `data-sanity` for text that isn't marked invisibly (numbers, links): click it in the Studio preview to open its field. */
// `base` is required: without it the Studio ignores the attribute and draws no outline.
export const sanityAttr = (path: string) => (visualEditingEnabled ? `id=homePage;type=homePage;path=${path};base=%2F` : undefined);

// Never mark values that end up in links, ids, classes or numbers: the invisible
// characters would break them.
// Whole field names, so labels like `setupLabel` or `monthlyText` still get click-to-edit.
const STEGA_SKIP_KEY = /^(_.*|id|key|type|icon|class|style|lang|date|currency|number|percent|price|setup|monthly|referralPercent|timeZone)$|(url|href|link|email|slug)$/i;
const stegaFilter = ({ sourcePath, value }: { sourcePath: ReadonlyArray<unknown>; value: unknown }) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  if (/^(https?:|mailto:|tel:|\/|#)/.test(value) || /^\d{4}-\d{2}-\d{2}/.test(value)) return false;
  const last = [...sourcePath].reverse().find((k) => typeof k === 'string') as string | undefined;
  return !(last && STEGA_SKIP_KEY.test(last));
};

let previewClient: SanityClient | undefined;
export function sanityPreviewClient() {
  const projectId = sanityProjectId();
  const token = import.meta.env.SANITY_API_READ_TOKEN;
  if (!projectId) throw new Error('SANITY_PROJECT_ID is not set.');
  if (!token) throw new Error('SANITY_API_READ_TOKEN is required for the visual editor preview.');
  previewClient ??= createClient({
    projectId,
    dataset: sanityDataset(),
    token,
    apiVersion: '2026-10-01',
    useCdn: false,
    perspective: 'drafts',
    resultSourceMap: 'withKeyArraySelector',
    stega: { enabled: true, studioUrl: import.meta.env.SANITY_STUDIO_URL || 'https://muzmeshcreative.com/studio', filter: stegaFilter },
  });
  return previewClient;
}

/**
 * Shortens the invisible click-to-edit markers. The client writes the Studio's full edit
 * link into every text (about 1.2 KB of invisible characters each, half the preview
 * page); the Presentation tab only needs the document, the field and a base URL, which
 * is about a third of that. Same format the Studio reads, so click-to-edit is unchanged.
 */
export function compactStega<T>(value: T): T {
  if (typeof value === 'string') {
    const { cleaned, encoded } = vercelStegaSplit(value);
    if (!encoded) return value;
    try {
      const { origin, href } = vercelStegaDecode<{ origin?: string; href?: string }>(encoded) ?? {};
      const q = new URL(href ?? '', 'https://x.invalid').searchParams;
      const id = q.get('id'), path = q.get('path');
      if (origin !== 'sanity.io' || !id || !path) return value;
      const short = new URLSearchParams({ baseUrl: '/', id, path });
      for (const k of ['type', 'perspective']) if (q.get(k)) short.set(k, q.get(k)!);
      return vercelStegaCombine(cleaned, { origin, href: `?${short}` }, false) as T;
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(compactStega) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, compactStega(v)])) as T;
  return value;
}

type SanityImage = { asset?: { _ref: string }; alt?: string };

const imageUrl = (image: SanityImage, width: number) =>
  createImageUrlBuilder(sanityClient()).image(image).width(width).auto('format').url();

export function portableTextToHtml(body: unknown) {
  if (!Array.isArray(body)) return '';
  return toHTML(body, {
    components: {
      types: {
        image: ({ value }: { value: SanityImage }) =>
          value.asset
            ? `<img src="${imageUrl(value, 1200)}" alt="${escapeHTML(value.alt ?? '')}" loading="lazy" decoding="async" />`
            : '',
      },
      marks: {
        link: ({ children, value }) => {
          const href: string = value?.href ?? '';
          if (!uriLooksSafe(href)) return children;
          const external = /^https?:\/\//.test(href) && !/^https?:\/\/(www\.)?muzmeshcreative\.com/.test(href);
          return `<a href="${escapeHTML(href)}"${external ? ' rel="noopener" target="_blank"' : ''}>${children}</a>`;
        },
      },
    },
  });
}

// GROQ returns null for empty fields; zod's .optional() only accepts undefined.
const dropNulls = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null));

/**
 * Astro content loader for a Sanity document type. The query must return
 * `slug` (used as the entry id, so URLs stay /blog/<slug> and /work/<slug>)
 * and may return `body` (Portable Text, rendered to HTML for `render(entry)`).
 */
export function sanityLoader(query: string): Loader {
  return {
    name: 'sanity-loader',
    load: async ({ store, parseData, generateDigest, logger }) => {
      // Lets the team work on design locally before Sanity is set up.
      // Production builds still fail loudly without a project ID.
      if (!sanityProjectId() && import.meta.env.DEV) {
        logger.warn('SANITY_PROJECT_ID is not set, so this collection is empty. See README to connect Sanity.');
        store.clear();
        return;
      }
      const docs = await sanityClient().fetch<Array<Record<string, unknown>>>(query);
      store.clear();
      for (const { slug, body, ...rest } of docs) {
        const id = String(slug);
        const data = await parseData({ id, data: dropNulls(rest) });
        const html = portableTextToHtml(body);
        store.set({ id, data, rendered: { html }, digest: generateDigest({ data, html }) });
      }
      logger.info(`Loaded ${docs.length} entries from Sanity`);
    },
  };
}

/**
 * Uses `fallback` when Sanity has no entries yet. Until the old posts are
 * imported (cd studio && npm run migrate), the site builds them from the same
 * Markdown files the import reads, so old /blog and /work URLs never 404.
 */
export function withFallback(primary: Loader, fallback: Loader): Loader {
  return {
    name: 'sanity-or-legacy',
    load: async (context) => {
      await primary.load(context);
      if (context.store.keys().length) return;
      context.logger.warn('Nothing in Sanity yet, so this collection is built from studio/scripts/legacy.');
      await fallback.load(context);
    },
  };
}
