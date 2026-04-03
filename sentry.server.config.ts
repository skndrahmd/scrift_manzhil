/**
 * Sentry Server-side Configuration
 * Initializes Sentry for Node.js runtime (server components, API routes, server actions)
 * Only runs when SENTRY_DSN is configured.
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs
 */

// Only initialize if DSN is set
if (process.env.SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,

      // Adjust this value in production
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Set to true to automatically send PII (user info, IP addresses)
      sendDefaultPii: true,

      // Replay configuration for server-side
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,

      // Ignore common Next.js errors that are not actionable
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
        "NetworkError",
        "Network request failed",
        "NEXT_REDIRECT",
        "NEXT_NOT_FOUND",
      ],
    })
  }).catch(() => {
    // Sentry failed to load - this is non-critical
  })
}