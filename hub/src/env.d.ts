/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
  APP_NAME?: string;
  /** Dev only: show the sign-in link on screen. Ignored unless the request is to localhost. */
  DEV_SHOW_LOGIN_LINK?: string;
  /** The first sign-in with this address creates the first MuzMesh staff account, only while there are no users. */
  BOOTSTRAP_ADMIN_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

declare module 'cloudflare:workers' {
  export const env: Env;
}

declare namespace App {
  interface Locals {
    user: import('./lib/types').User | null;
    /** Random per-response value for the Content-Security-Policy. */
    nonce: string;
  }
}
