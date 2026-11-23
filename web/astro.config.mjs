// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// Visual editor preview. The live site stays 100% static. A separate preview
// deployment (PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true) adds one on-demand
// route, /preview, that renders the homepage from draft content for the
// Studio's Presentation tool.
const visualEditing = process.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === 'true';

/** @type {import('astro').AstroIntegration} */
const previewRoute = {
  name: 'muzmesh-preview-route',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({ pattern: '/preview', entrypoint: './src/preview/index.astro', prerender: false });
    },
  },
};

// Old Webflow URLs are redirected in vercel.json (real 301s at the edge),
// not here, so the static build stays clean.
export default defineConfig({
  site: 'https://muzmeshcreative.com',
  trailingSlash: 'never',
  integrations: [
    mdx(),
    react(),
    // Placeholder legal pages are noindex until real text exists.
    sitemap({ filter: (page) => !/\/(privacy|terms)$/.test(page) }),
    ...(visualEditing ? [previewRoute] : []),
  ],
  ...(visualEditing ? { adapter: vercel() } : {}),
  vite: {
    plugins: [tailwindcss()],
  },
});
