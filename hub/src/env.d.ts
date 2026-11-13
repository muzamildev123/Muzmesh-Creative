/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
  DB: D1Database;
  APP_NAME?: string;
  /** Dev only: show the sign-in link on screen. Ignored unless the request is to localhost. */
  DEV_SHOW_LOGIN_LINK?: string;
  /** The first sign-in with this address creates the first MuzMesh staff account, only while there are no users. */
  BOOTSTRAP_ADMIN_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /** The app's public address, e.g. https://room.muzmesh.com. Used for short links and emails sent by the scheduler. */
  APP_ORIGIN?: string;
  /** 32 random bytes, base64. Encrypts LinkedIn and X tokens. */
  TOKEN_KEY?: string;
  LINKEDIN_CLIENT_ID?: string; LINKEDIN_CLIENT_SECRET?: string; LINKEDIN_API_VERSION?: string; LINKEDIN_ORG_POSTING?: string;
  X_CLIENT_ID?: string; X_CLIENT_SECRET?: string;
  /** Test only: point the networks and Google at a fake server. */
  LINKEDIN_AUTH_BASE?: string; LINKEDIN_API_BASE?: string; X_AUTH_BASE?: string; X_API_BASE?: string;
  GA4_API_BASE?: string; GSC_API_BASE?: string; GOOGLE_TOKEN_URL?: string;
  /** The Google service account key (JSON) used to read clients' Analytics and Search Console. */
  GOOGLE_SERVICE_ACCOUNT?: string;
  /** R2 bucket for the assets library. */
  FILES?: R2Bucket;
  }
}

declare namespace App {
  interface Locals {
    user: import('./lib/types').User | null;
  }
}
