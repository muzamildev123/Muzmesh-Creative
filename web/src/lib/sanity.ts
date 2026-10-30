import { createClient, type SanityClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import { toHTML, uriLooksSafe, escapeHTML } from '@portabletext/to-html';
import type { Loader } from 'astro/loaders';

// Content is read at build time only. Publishing in the Studio triggers a
// Vercel deploy hook, which rebuilds the site with the new content.
let client: SanityClient | undefined;

export function sanityClient() {
  const projectId = import.meta.env.SANITY_PROJECT_ID;
  if (!projectId) {
    throw new Error('SANITY_PROJECT_ID is not set. Copy web/.env.example to web/.env and fill it in (see README).');
  }
  client ??= createClient({
    projectId,
    dataset: import.meta.env.SANITY_DATASET || 'production',
    apiVersion: '2026-10-01',
    // Skip the CDN so a rebuild right after Publish never gets stale content.
    useCdn: false,
    perspective: 'published',
  });
  return client;
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
