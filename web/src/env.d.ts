interface ImportMetaEnv {
  readonly PUBLIC_LEAD_ENDPOINT?: string;
  readonly PUBLIC_BOOKING_URL?: string;
  readonly SANITY_PROJECT_ID?: string;
  readonly SANITY_DATASET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
