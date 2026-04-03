/**
 * Sentry Edge Runtime Configuration
 * Initializes Sentry for Edge runtime (middleware, edge functions)
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs
 */

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set to true to automatically send PII
  sendDefaultPii: true,
})