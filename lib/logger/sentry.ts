/**
 * @module logger/sentry
 * Sentry integration utilities for error tracking.
 * Works with @sentry/nextjs for Next.js 15+ compatibility.
 *
 * Sentry is automatically initialized via:
 * - sentry.server.config.ts (Node.js runtime)
 * - sentry.client.config.ts (Browser runtime)
 * - sentry.edge.config.ts (Edge runtime)
 *
 * Usage:
 * ```ts
 * import { captureError, setSentryUser } from "@/lib/logger/sentry"
 *
 * // Capture errors with context
 * captureError(error, { tags: { component: "api/users" } })
 *
 * // Set user context after authentication
 * setSentryUser({ id: "123", email: "user@example.com" })
 * ```
 */

import * as Sentry from "@sentry/nextjs"
import { getRequestId, getUserId, getAdminId, getRequestDuration } from "./request-id"

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

/**
 * Check if Sentry is configured (DSN is set).
 */
export function isSentryEnabled(): boolean {
  return !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
}

/**
 * Capture an exception with optional context.
 * Automatically includes request context from AsyncLocalStorage.
 */
export function captureError(error: Error | unknown, context?: CaptureContext): string {
  const requestId = getRequestId()
  const userId = getUserId()
  const adminId = getAdminId()
  const duration = getRequestDuration()

  return Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: {
      request_id: requestId,
      user_id: userId,
      admin_id: adminId,
      ...context?.tags,
    },
    extra: {
      request_duration_ms: duration,
      ...context?.extra,
    },
    level: context?.level || "error",
  })
}

/**
 * Capture a message with optional context.
 */
export function captureMessage(message: string, context?: CaptureContext): string {
  const requestId = getRequestId()

  return Sentry.captureMessage(message, {
    tags: {
      request_id: requestId,
      ...context?.tags,
    },
    extra: context?.extra,
    level: context?.level || "info",
  })
}

/**
 * Set the current user context for Sentry.
 * Call after authentication to associate errors with users.
 */
export function setSentryUser(user: { id?: string; email?: string; username?: string; role?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    })
    if (user.role) {
      Sentry.setTag("user_role", user.role)
    }
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Set a custom tag for the current scope.
 */
export function setSentryTag(key: string, value: string | number | boolean): void {
  Sentry.setTag(key, value)
}

/**
 * Set extra context for the current scope.
 */
export function setSentryExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value)
}

/**
 * Add a breadcrumb for transaction tracking.
 */
export function addBreadcrumb(message: string, category?: string): void {
  Sentry.addBreadcrumb({
    message,
    category: category || "app",
    level: "info",
  })
}

/**
 * Create an error tracking wrapper for server actions.
 * Automatically captures errors to Sentry.
 *
 * @example
 * ```ts
 * // app/actions/users.ts
 * "use server"
 * import { withServerActionInstrumentation } from "@/lib/logger/sentry"
 *
 * export const createUser = withServerActionInstrumentation(
 *   "createUser",
 *   async (formData: FormData) => {
 *     // Your server action code
 *   }
 * )
 * ```
 */
export function withServerActionInstrumentation<T>(
  name: string,
  handler: () => Promise<T>,
  options?: {
    headers?: Headers
    recordResponse?: boolean
  }
): Promise<T> {
  return Sentry.withServerActionInstrumentation(name, options ?? {}, handler)
}

/**
 * Start a new transaction span for performance monitoring.
 */
export function startSpan<T>(
  name: string,
  op: string,
  callback: () => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan({ name, op }, callback)
}