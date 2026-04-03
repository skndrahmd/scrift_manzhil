/**
 * @module instrumentation
 * Next.js instrumentation hook for server startup.
 * Initializes Sentry for all Next.js runtimes (Node.js, Edge, Client).
 *
 * This file runs once when the Next.js server starts.
 * For Next.js 14, instrumentationHook must be enabled in next.config.js
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize Sentry for Node.js runtime (server components, API routes)
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Initialize Sentry for Edge runtime (middleware)
    await import("./sentry.edge.config")
  }
}