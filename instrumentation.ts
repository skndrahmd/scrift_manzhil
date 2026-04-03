/**
 * @module instrumentation
 * Next.js instrumentation hook for server startup.
 * Initializes logging, error tracking, and other services.
 *
 * This file runs once when the Next.js server starts.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize Sentry for error tracking (only if SENTRY_DSN is set)
    const { initSentry } = await import("./lib/logger/sentry")
    initSentry()

    // Log server startup
    const { logger } = await import("./lib/logger")
    logger.info("Server starting", {
      env: process.env.NODE_ENV,
      nodeVersion: process.version,
    })
  }
}