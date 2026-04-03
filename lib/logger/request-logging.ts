/**
 * @module logger/request-logging
 * Request logging utilities for API routes.
 * Wraps Next.js API route handlers with request ID tracking and structured logging.
 */

import { type NextRequest, NextResponse } from "next/server"
import {
  generateRequestId,
  withRequestContext,
  getRequestDuration,
} from "./request-id"

// Lazy-load the logger to avoid circular dependency with index.ts
// The logger is created on first use rather than at module load time
let _log: ReturnType<typeof import("./index").createModuleLogger> | null = null

function getLog() {
  if (!_log) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _log = require("./index").createModuleLogger("http")
  }
  return _log
}

export interface RequestLogOptions {
  /** Module name for logging context (defaults to "api") */
  module?: string
  /** Whether to log request body (default: false, be careful with sensitive data) */
  logBody?: boolean
  /** Whether to log response body (default: false) */
  logResponseBody?: boolean
  /** Exclude specific paths from logging (e.g., health checks) */
  excludePaths?: string[]
}

/**
 * Wraps an API route handler with request logging and request ID tracking.
 *
 * @example
 * ```ts
 * // app/api/example/route.ts
 * import { withRequestLogging } from "@/lib/logger/request-logging"
 *
 * export const GET = withRequestLogging(async (request) => {
 *   // Your handler code here
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function withRequestLogging<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse> | NextResponse,
  options: RequestLogOptions = {}
): (request: T) => Promise<NextResponse> {
  const {
    module = "api",
    excludePaths = ["/api/ping", "/api/health"],
  } = options

  return async (request: T): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const path = new URL(request.url).pathname
    const method = request.method

    // Skip logging for excluded paths
    if (excludePaths.some(p => path.startsWith(p))) {
      return withRequestContext(requestId, () => handler(request), {
        path,
        method,
      })
    }

    // Log incoming request
    getLog().info(`→ ${method} ${path}`, {
      requestId,
      module,
      method,
      path,
    })

    const startTime = Date.now()

    try {
      const response = await withRequestContext(requestId, () => handler(request), {
        path,
        method,
      })

      const duration = Date.now() - startTime

      // Log successful response
      getLog().info(`← ${method} ${path} ${response.status}`, {
        requestId,
        module,
        method,
        path,
        status: response.status,
        duration,
      })

      // Add request ID to response headers for debugging
      response.headers.set("x-request-id", requestId)

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Log error response
      getLog().error(`✗ ${method} ${path} ERROR`, {
        requestId,
        module,
        method,
        path,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Re-throw to let Next.js handle the error response
      throw error
    }
  }
}

/**
 * Higher-order function to add request logging to API routes with module context.
 *
 * @example
 * ```ts
 * // app/api/users/route.ts
 * import { createApiLogger } from "@/lib/logger/request-logging"
 *
 * const log = createApiLogger("users")
 *
 * export const GET = log.wrap(async (request) => {
 *   log.info("Fetching users")
 *   return NextResponse.json({ users: [] })
 * })
 * ```
 */
export function createApiLogger(module: string) {
  const moduleLog = getLog().withContext({ module })

  return {
    log: moduleLog,

    wrap: <T extends NextRequest>(
      handler: (request: T) => Promise<NextResponse> | NextResponse,
      options?: Omit<RequestLogOptions, "module">
    ) => withRequestLogging(handler, { ...options, module }),

    info: moduleLog.info.bind(moduleLog),
    debug: moduleLog.debug.bind(moduleLog),
    warn: moduleLog.warn.bind(moduleLog),
    error: moduleLog.error.bind(moduleLog),
  }
}

/**
 * Log middleware requests (page navigation).
 * Used in middleware.ts for page request logging.
 */
export function logMiddlewareRequest(
  request: NextRequest,
  response: NextResponse,
  startTime: number
): void {
  const path = new URL(request.url).pathname
  const method = request.method
  const duration = Date.now() - startTime
  const requestId = response.headers.get("x-request-id") || undefined

  // Skip static assets and health checks
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".svg") ||
    path.endsWith(".ico")
  ) {
    return
  }

  getLog().debug(`${method} ${path} → ${response.status}`, {
    requestId,
    module: "middleware",
    method,
    path,
    status: response.status,
    duration,
  })
}