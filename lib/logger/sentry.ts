/**
 * @module logger/sentry
 * Sentry integration for error tracking and performance monitoring.
 * Optional dependency - only active when SENTRY_DSN is configured.
 *
 * Setup:
 * 1. Install Sentry: npm install @sentry/nextjs
 * 2. Add SENTRY_DSN to your environment variables
 * 3. Import and call initSentry() in instrumentation.ts (if using) or at app startup
 *
 * Usage:
 * ```ts
 * import { initSentry, captureError, setSentryUser } from "@/lib/logger/sentry"
 *
 * // Initialize at app startup (instrumentation.ts or similar)
 * initSentry()
 *
 * // Capture errors with context
 * captureError(error, { component: "api/users", action: "create" })
 *
 * // Set user context after authentication
 * setSentryUser({ id: "123", email: "user@example.com", role: "admin" })
 * ```
 */

import { getRequestId, getUserId, getAdminId, getRequestDuration } from "./request-id"

// Sentry types - these are optional imports
type SentryUser = {
  id?: string
  email?: string
  username?: string
  role?: string
}

type CaptureContext = {
  tags?: Record<string, string | number | boolean>
  extra?: Record<string, unknown>
  level?: "fatal" | "error" | "warning" | "info" | "debug"
}

// Lazy-loaded Sentry client
let sentryClient: {
  captureException: (error: Error, context?: CaptureContext) => string
  captureMessage: (message: string, context?: CaptureContext) => string
  setUser: (user: SentryUser | null) => void
  setTag: (key: string, value: string | number | boolean) => void
  setExtra: (key: string, value: unknown) => void
  addBreadcrumb: (breadcrumb: { message: string; category?: string; level?: string }) => void
} | null = null

/**
 * Initialize Sentry client.
 * Only initializes if SENTRY_DSN environment variable is set.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    // Sentry not configured - error tracking disabled
    return
  }

  // Dynamically import Sentry to avoid bundling issues when not used
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || "development",
        release: process.env.npm_package_version || "unknown",

        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

        // Session replay (optional)
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Filter out sensitive data
        beforeSend(event, hint) {
          // Remove sensitive headers
          if (event.request?.headers) {
            delete event.request.headers.authorization
            delete event.request.headers.cookie
            delete event.request.headers["set-cookie"]
          }

          // Remove sensitive user data
          if (event.user) {
            delete event.user.ip_address
          }

          return event
        },

        // Ignore common non-critical errors
        ignoreErrors: [
          // Browser extensions
          "ResizeObserver loop limit exceeded",
          "ResizeObserver loop completed with undelivered notifications",
          // Network errors
          "NetworkError",
          "Network request failed",
          // Auth errors
          "Unauthorized",
          "Not authenticated",
        ],
      })

      sentryClient = {
        captureException: (error: Error, context?: CaptureContext) => {
          const requestId = getRequestId()

          Sentry.withScope((scope) => {
            // Add request context
            if (requestId) {
              scope.setTag("request_id", requestId)
            }

            const userId = getUserId()
            const adminId = getAdminId()

            if (userId) scope.setUser({ id: userId })
            if (adminId) scope.setTag("admin_id", adminId)

            // Add duration
            const duration = getRequestDuration()
            if (duration !== undefined) {
              scope.setExtra("request_duration_ms", duration)
            }

            // Add custom context
            if (context?.tags) {
              Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value)
              })
            }

            if (context?.extra) {
              Object.entries(context.extra).forEach(([key, value]) => {
                scope.setExtra(key, value)
              })
            }

            if (context?.level) {
              scope.setLevel(context.level)
            }

            Sentry.captureException(error)
          })

          return requestId || "no-request-id"
        },

        captureMessage: (message: string, context?: CaptureContext) => {
          const requestId = getRequestId()

          Sentry.withScope((scope) => {
            if (requestId) scope.setTag("request_id", requestId)

            if (context?.tags) {
              Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value)
              })
            }

            if (context?.extra) {
              Object.entries(context.extra).forEach(([key, value]) => {
                scope.setExtra(key, value)
              })
            }

            if (context?.level) {
              scope.setLevel(context.level)
            }

            Sentry.captureMessage(message)
          })

          return requestId || "no-request-id"
        },

        setUser: (user: SentryUser | null) => {
          Sentry.setUser(user ? { id: user.id, email: user.email, username: user.username } : null)
        },

        setTag: (key: string, value: string | number | boolean) => {
          Sentry.setTag(key, value)
        },

        setExtra: (key: string, value: unknown) => {
          Sentry.setExtra(key, value)
        },

        addBreadcrumb: (breadcrumb: { message: string; category?: string; level?: string }) => {
          Sentry.addBreadcrumb(breadcrumb)
        },
      }
    })
    .catch((error) => {
      // Failed to load Sentry - this is non-critical
      console.error("Failed to initialize Sentry:", error)
    })
}

/**
 * Check if Sentry is initialized and available.
 */
export function isSentryEnabled(): boolean {
  return sentryClient !== null
}

/**
 * Capture an exception with optional context.
 * Automatically includes request context from AsyncLocalStorage.
 */
export function captureError(error: Error | unknown, context?: CaptureContext): string | null {
  if (!sentryClient) {
    return null
  }

  const err = error instanceof Error ? error : new Error(String(error))
  return sentryClient.captureException(err, context)
}

/**
 * Capture a message with optional context.
 */
export function captureMessage(message: string, context?: CaptureContext): string | null {
  if (!sentryClient) {
    return null
  }

  return sentryClient.captureMessage(message, context)
}

/**
 * Set the current user context for Sentry.
 * Call after authentication to associate errors with users.
 */
export function setSentryUser(user: { id?: string; email?: string; username?: string; role?: string } | null): void {
  if (!sentryClient) return

  sentryClient.setUser(user)
}

/**
 * Set a custom tag for the current scope.
 */
export function setSentryTag(key: string, value: string | number | boolean): void {
  if (!sentryClient) return

  sentryClient.setTag(key, value)
}

/**
 * Set extra context for the current scope.
 */
export function setSentryExtra(key: string, value: unknown): void {
  if (!sentryClient) return

  sentryClient.setExtra(key, value)
}

/**
 * Add a breadcrumb for transaction tracking.
 */
export function addBreadcrumb(message: string, category?: string): void {
  if (!sentryClient) return

  sentryClient.addBreadcrumb({
    message,
    category: category || "app",
    level: "info",
  })
}

/**
 * Create an error tracking wrapper for API routes.
 * Automatically captures errors to Sentry and logs them.
 *
 * @example
 * ```ts
 * // app/api/users/route.ts
 * import { withErrorTracking } from "@/lib/logger/sentry"
 *
 * export const GET = withErrorTracking(async (request) => {
 *   // Your handler code
 *   return NextResponse.json({ users: [] })
 * }, { component: "api/users", operation: "list" })
 * ```
 */
export function withErrorTracking<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context?: { component?: string; operation?: string }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Capture to Sentry
      captureError(error, {
        tags: {
          component: context?.component || "unknown",
          operation: context?.operation || "unknown",
        },
        extra: {
          args: args.map((arg) => {
            // Try to extract useful info from Request objects
            if (arg && typeof arg === "object" && "url" in arg) {
              try {
                const url = new URL((arg as { url: string }).url)
                return {
                  method: (arg as { method?: string }).method,
                  path: url.pathname,
                }
              } catch {
                return "[Request]"
              }
            }
            return "[unknown]"
          }),
        },
      })

      // Re-throw to let Next.js handle the response
      throw error
    }
  }
}