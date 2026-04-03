/**
 * @module logger
 * Structured logging utility using Pino for production-grade logging.
 * Provides JSON output, log levels, request ID tracking, and context enrichment.
 */

import pino from "pino"
import { formatRequestContext, getRequestId, getRequestContext } from "./request-id"

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

interface LogContext {
  [key: string]: unknown
}

interface Logger {
  trace: (message: string, context?: LogContext) => void
  debug: (message: string, context?: LogContext) => void
  info: (message: string, context?: LogContext) => void
  warn: (message: string, context?: LogContext) => void
  error: (message: string, context?: LogContext) => void
  fatal: (message: string, context?: LogContext) => void
  withContext: (context: LogContext) => Logger
  child: (context: LogContext) => Logger
}

// Determine log level from environment
const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
  if (envLevel && ["trace", "debug", "info", "warn", "error", "fatal"].includes(envLevel)) {
    return envLevel
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug"
}

// Create the base Pino logger
const createPinoLogger = () => {
  const isProduction = process.env.NODE_ENV === "production"
  const isDevelopment = process.env.NODE_ENV === "development"

  return pino({
    level: getLogLevel(),
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: () => ({}),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "password",
        "passwordHash",
        "token",
        "accessToken",
        "refreshToken",
        "apiKey",
        "secret",
        "authorization",
        "cookie",
        "headers.authorization",
        "headers.cookie",
        "*.password",
        "*.token",
      ],
      censor: "[REDACTED]",
    },
    base: {
      env: process.env.NODE_ENV || "development",
      app: "manzhil-bms",
    },
  })
}

let pinoInstance: pino.Logger | null = null

const getLogger = (): pino.Logger => {
  if (!pinoInstance) {
    pinoInstance = createPinoLogger()
  }
  return pinoInstance
}

/**
 * Create a logger wrapper with context support and request ID injection
 */
const createLogger = (baseContext: LogContext = {}): Logger => {
  const pino = getLogger()

  const log = (level: LogLevel, message: string, context?: LogContext) => {
    const requestContext = formatRequestContext()
    const mergedContext = { ...requestContext, ...baseContext, ...context }
    pino[level]({ ...mergedContext, msg: message })
  }

  const methods = {
    trace: (message: string, context?: LogContext) => log("trace", message, context),
    debug: (message: string, context?: LogContext) => log("debug", message, context),
    info: (message: string, context?: LogContext) => log("info", message, context),
    warn: (message: string, context?: LogContext) => log("warn", message, context),
    error: (message: string, context?: LogContext) => log("error", message, context),
    fatal: (message: string, context?: LogContext) => log("fatal", message, context),
  }

  return {
    ...methods,
    withContext: (context: LogContext) => createLogger({ ...baseContext, ...context }),
    child: (context: LogContext) => createLogger({ ...baseContext, ...context }),
  }
}

// Default logger instance
export const logger = createLogger()

/**
 * Create a child logger with module name for easy filtering
 */
export function createModuleLogger(module: string): Logger {
  return logger.child({ module })
}

/**
 * Create a logger for API routes with request context
 */
export function createRequestLogger(requestId: string, userId?: string, adminId?: string): Logger {
  return logger.child({ requestId, userId, adminId })
}

// Export everything from request-id module
export {
  generateRequestId,
  getRequestContext,
  getRequestId,
  getUserId,
  getAdminId,
  withRequestContext,
  updateRequestContext,
  getRequestDuration,
  formatRequestContext,
} from "./request-id"

export {
  withRequestLogging,
  createApiLogger,
  logMiddlewareRequest,
  type RequestLogOptions,
} from "./request-logging"

export {
  initSentry,
  isSentryEnabled,
  captureError,
  captureMessage,
  setSentryUser,
  setSentryTag,
  setSentryExtra,
  addBreadcrumb,
  withErrorTracking,
} from "./sentry"

export { getLogLevel }