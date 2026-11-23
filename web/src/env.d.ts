interface ImportMetaEnv {
  readonly PUBLIC_LEAD_ENDPOINT?: string;
  readonly PUBLIC_BOOKING_URL?: string;
  readonly SANITY_PROJECT_ID?: string;
  readonly SANITY_DATASET?: string;
  // Set by the Sanity integration on Vercel
  readonly SANITY_API_PROJECT_ID?: string;
  readonly SANITY_API_DATASET?: string;
  readonly SANITY_API_READ_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
