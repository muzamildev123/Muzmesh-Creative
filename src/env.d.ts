interface ImportMetaEnv {
  readonly PUBLIC_LEAD_ENDPOINT?: string;
  readonly PUBLIC_BOOKING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
