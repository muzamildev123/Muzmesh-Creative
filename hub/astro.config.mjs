// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Launch Room: the client + MuzMesh dashboard. Runs on Cloudflare Workers with a D1 database.
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  trailingSlash: 'never',
  // Every stylesheet is a file, so the Content-Security-Policy can forbid inline styles.
  build: { inlineStylesheets: 'never' },
  // Origin checks are done in src/middleware.ts so the OAuth and MCP endpoints
  // (which are called cross-origin with bearer tokens, never cookies) can be exempt.
  security: { checkOrigin: false },
  devToolbar: { enabled: false },
});
