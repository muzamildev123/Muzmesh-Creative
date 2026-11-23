interface ImportMetaEnv {
  readonly PUBLIC_LEAD_ENDPOINT?: string;
  readonly PUBLIC_BOOKING_URL?: string;
  // Traffic tools (see src/components/Tracking.astro); empty = off
  readonly PUBLIC_GA_ID?: string;
  readonly PUBLIC_CLARITY_ID?: string;
  readonly PUBLIC_GOOGLE_SITE_VERIFICATION?: string;
  readonly PUBLIC_BING_SITE_VERIFICATION?: string;
  readonly SANITY_PROJECT_ID?: string;
  readonly SANITY_DATASET?: string;
  // Set by the Sanity integration on Vercel
  readonly SANITY_API_PROJECT_ID?: string;
  readonly SANITY_API_DATASET?: string;
  readonly SANITY_API_READ_TOKEN?: string;
  // Visual editor preview deployment only (see astro.config.mjs)
  readonly PUBLIC_SANITY_VISUAL_EDITING_ENABLED?: string;
  readonly SANITY_STUDIO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
