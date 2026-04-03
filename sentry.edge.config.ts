/**
 * Sentry Edge Runtime Configuration
 * Only initializes when SENTRY_DSN is configured.
 */

if (process.env.SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      sendDefaultPii: true,
    })
  }).catch(() => {})
}