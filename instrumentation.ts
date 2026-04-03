/**
 * @module instrumentation
 * Next.js instrumentation hook for server startup.
 * Initializes Sentry for all Next.js runtimes (Node.js, Edge, Client).
 *
 * This file runs once when the Next.js server starts.
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

// Capture request errors automatically
export const onRequestError = async (
  error: unknown,
  request: {
    path: string
    method: string
  },
  context: {
    routerKind: "App Router" | "Pages Router"
  }
) => {
  const Sentry = await import("@sentry/nextjs")
  Sentry.captureException(error, {
    tags: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
    },
  })
}