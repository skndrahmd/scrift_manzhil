/**
 * @module cron-logger
 * Utility for logging cron job executions and welcome messages to the database.
 * Provides consistent logging across all cron jobs with detailed results.
 */

import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { createModuleLogger } from "@/lib/logger"

const log = createModuleLogger("cron")

// ============================================
// Types
// ============================================

export type CronJobStatus = "success" | "partial" | "failed" | "running"

export interface CronLogStart {
  id: string
  jobName: string
  startedAt: Date
}

export interface CronLogResult {
  status: CronJobStatus
  recordsProcessed: number
  recordsSucceeded: number
  recordsFailed: number
  result?: Record<string, unknown>
  errorMessage?: string
}

export interface WelcomeLogEntry {
  residentId?: string | null
  residentName?: string | null
  phoneNumber: string
  apartmentNumber?: string | null
  status: "sent" | "failed" | "pending"
  errorMessage?: string | null
  twilioSid?: string | null
  triggeredBy: "bulk-import" | "manual" | "resend"
  triggeredByUser?: string | null
}

// ============================================
// Cron Job Logging
// ============================================

/**
 * Start logging a cron job execution.
 * Creates a log entry with status 'running'.
 * Returns the log ID to be used with endCronJob.
 */
export async function startCronJob(jobName: string): Promise<CronLogStart> {
  const startedAt = new Date()
  const logId = crypto.randomUUID()

  try {
    await supabaseAdmin.from("cron_logs").insert({
      id: logId,
      job_name: jobName,
      status: "running",
      started_at: startedAt.toISOString(),
    })

    log.info("Cron job started", { jobName, logId })
  } catch (error) {
    log.error("Failed to create log entry", { jobName, logId, error })
  }

  return {
    id: logId,
    jobName,
    startedAt,
  }
}

/**
 * End logging a cron job execution.
 * Updates the log entry with final status and results.
 */
export async function endCronJob(
  cronLog: CronLogStart,
  result: CronLogResult
): Promise<void> {
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - cronLog.startedAt.getTime()

  try {
    const { error } = await supabaseAdmin
      .from("cron_logs")
      .update({
        status: result.status,
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        records_processed: result.recordsProcessed,
        records_succeeded: result.recordsSucceeded,
        records_failed: result.recordsFailed,
        result: result.result || null,
        error_message: result.errorMessage || null,
      })
      .eq("id", cronLog.id)

    if (error) {
      log.error("Failed to update log entry", { jobName: cronLog.jobName, logId: cronLog.id, error })
    } else {
      log.info("Cron job completed", {
        jobName: cronLog.jobName,
        logId: cronLog.id,
        status: result.status,
        durationMs,
        succeeded: result.recordsSucceeded,
        processed: result.recordsProcessed,
      })
    }
  } catch (error) {
    log.error("Failed to update log entry", { jobName: cronLog.jobName, logId: cronLog.id, error })
  }
}

/**
 * Log a cron job error (for unhandled exceptions).
 */
export async function logCronError(
  cronLog: CronLogStart,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error"
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - cronLog.startedAt.getTime()

  try {
    await supabaseAdmin
      .from("cron_logs")
      .update({
        status: "failed",
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        error_message: errorMessage,
      })
      .eq("id", cronLog.id)

    log.error("Cron job failed", { jobName: cronLog.jobName, logId: cronLog.id, errorMessage, durationMs })
  } catch (logError) {
    log.error("Failed to update error log", { jobName: cronLog.jobName, logId: cronLog.id, error: logError })
  }
}

// ============================================
// Welcome Message Logging
// ============================================

/**
 * Log a welcome message attempt.
 */
export async function logWelcomeMessage(entry: WelcomeLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from("welcome_message_logs").insert({
      resident_id: entry.residentId || null,
      resident_name: entry.residentName || null,
      phone_number: entry.phoneNumber,
      apartment_number: entry.apartmentNumber || null,
      status: entry.status,
      error_message: entry.errorMessage || null,
      twilio_sid: entry.twilioSid || null,
      triggered_by: entry.triggeredBy,
      triggered_by_user: entry.triggeredByUser || null,
      sent_at: await getPakistanISOString(),
    })
  } catch (error) {
    log.error("Failed to log welcome message", { phoneNumber: entry.phoneNumber, error })
  }
}

/**
 * Log multiple welcome message attempts in bulk.
 */
export async function logWelcomeMessages(
  entries: WelcomeLogEntry[]
): Promise<void> {
  if (entries.length === 0) return

  try {
    const sentAt = await getPakistanISOString()
    const rows = entries.map((entry) => ({
      resident_id: entry.residentId || null,
      resident_name: entry.residentName || null,
      phone_number: entry.phoneNumber,
      apartment_number: entry.apartmentNumber || null,
      status: entry.status,
      error_message: entry.errorMessage || null,
      twilio_sid: entry.twilioSid || null,
      triggered_by: entry.triggeredBy,
      triggered_by_user: entry.triggeredByUser || null,
      sent_at: sentAt,
    }))

    await supabaseAdmin.from("welcome_message_logs").insert(rows)
  } catch (error) {
    log.error("Failed to log welcome messages", { count: entries.length, error })
  }
}

// ============================================
// Query Helpers
// ============================================

/**
 * Get recent cron logs for a specific job.
 */
export async function getCronLogs(
  jobName?: string,
  limit: number = 50
): Promise<CronLogEntry[]> {
  try {
    let query = supabaseAdmin
      .from("cron_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (jobName) {
      query = query.eq("job_name", jobName)
    }

    const { data, error } = await query

    if (error) {
      log.error("Failed to fetch cron logs", { jobName, error })
      return []
    }

    return data || []
  } catch (error) {
    log.error("Failed to fetch cron logs", { jobName, error })
    return []
  }
}

/**
 * Get recent welcome message logs.
 */
export async function getWelcomeLogs(
  status?: "sent" | "failed" | "pending",
  limit: number = 100
): Promise<WelcomeLogEntry[]> {
  try {
    let query = supabaseAdmin
      .from("welcome_message_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      log.error("Failed to fetch welcome logs", { status, error })
      return []
    }

    return data || []
  } catch (error) {
    log.error("Failed to fetch welcome logs", { status, error })
    return []
  }
}

// Type for cron log entry from database
export interface CronLogEntry {
  id: string
  job_name: string
  status: CronJobStatus
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  records_processed: number
  records_succeeded: number
  records_failed: number
  result: Record<string, unknown> | null
  error_message: string | null
  created_at: string
}

// Type for welcome log entry from database
export interface WelcomeLogEntryFromDB {
  id: string
  resident_id: string | null
  resident_name: string | null
  phone_number: string
  apartment_number: string | null
  status: "sent" | "failed" | "pending"
  error_message: string | null
  twilio_sid: string | null
  triggered_by: "bulk-import" | "manual" | "resend"
  triggered_by_user: string | null
  sent_at: string
  created_at: string
}