/**
 * @module logger/request-id
 * Request ID generation and tracking for distributed tracing.
 * Generates unique IDs for each request and provides AsyncLocalStorage-based context.
 */

import { AsyncLocalStorage } from "async_hooks"

interface RequestContext {
  requestId: string
  userId?: string
  adminId?: string
  startTime: number
  path?: string
  method?: string
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Generate a unique request ID using crypto or fallback to timestamp-based
 */
export function generateRequestId(): string {
  // Use crypto.randomUUID if available (Node.js 15.6+)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Get the current request context from async storage
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore()
}

/**
 * Get the current request ID (returns undefined if outside request scope)
 */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId
}

/**
 * Get the current user ID (returns undefined if outside request scope or not authenticated)
 */
export function getUserId(): string | undefined {
  return asyncLocalStorage.getStore()?.userId
}

/**
 * Get the current admin ID (returns undefined if outside request scope or not an admin)
 */
export function getAdminId(): string | undefined {
  return asyncLocalStorage.getStore()?.adminId
}

/**
 * Run a function within a request context
 */
export function withRequestContext<T>(
  requestId: string,
  fn: () => T,
  options?: { userId?: string; adminId?: string; path?: string; method?: string }
): T {
  const context: RequestContext = {
    requestId,
    userId: options?.userId,
    adminId: options?.adminId,
    startTime: Date.now(),
    path: options?.path,
    method: options?.method,
  }
  return asyncLocalStorage.run(context, fn)
}

/**
 * Update the current request context with user info
 * Call this after authentication to add user/admin IDs
 */
export function updateRequestContext(updates: { userId?: string; adminId?: string }): void {
  const store = asyncLocalStorage.getStore()
  if (store) {
    if (updates.userId) store.userId = updates.userId
    if (updates.adminId) store.adminId = updates.adminId
  }
}

/**
 * Get request duration in milliseconds
 */
export function getRequestDuration(): number | undefined {
  const store = asyncLocalStorage.getStore()
  if (!store) return undefined
  return Date.now() - store.startTime
}

/**
 * Format request context for logging
 */
export function formatRequestContext(): Record<string, unknown> {
  const context = asyncLocalStorage.getStore()
  if (!context) return {}

  return {
    requestId: context.requestId,
    ...(context.userId && { userId: context.userId }),
    ...(context.adminId && { adminId: context.adminId }),
    ...(context.path && { path: context.path }),
    ...(context.method && { method: context.method }),
    duration: getRequestDuration(),
  }
}