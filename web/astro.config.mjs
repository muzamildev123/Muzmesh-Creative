// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
