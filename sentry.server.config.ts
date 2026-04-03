/**
 * Sentry Server-side Configuration
 * Initializes Sentry for Node.js runtime (server components, API routes, server actions)
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs
 */

import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set to true to automatically send PII (user info, IP addresses)
  sendDefaultPii: true,

  // Replay configuration for server-side
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Enable structured logs
  enableLogs: true,

  // Ignore common Next.js errors that are not actionable
  ignoreErrors: [
    // Browser extensions
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors
    "NetworkError",
    "Network request failed",
    // Next.js specific
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
})