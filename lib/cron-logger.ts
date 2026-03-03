/**
 * @module cron-logger
 * Utility for logging cron job executions and welcome messages to the database.
 * Provides consistent logging across all cron jobs with detailed results.
 */

import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"

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

    console.log(`[CRON LOG] Started: ${jobName} (${logId})`)
  } catch (error) {
    console.error(`[CRON LOG] Failed to create log entry:`, error)
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
  log: CronLogStart,
  result: CronLogResult
): Promise<void> {
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - log.startedAt.getTime()

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
      .eq("id", log.id)

    if (error) {
      console.error(`[CRON LOG] Failed to update log entry:`, error)
    } else {
      console.log(
        `[CRON LOG] Completed: ${log.jobName} (${log.id}) - ${result.status} - ${durationMs}ms - ${result.recordsSucceeded}/${result.recordsProcessed} succeeded`
      )
    }
  } catch (error) {
    console.error(`[CRON LOG] Failed to update log entry:`, error)
  }
}

/**
 * Log a cron job error (for unhandled exceptions).
 */
export async function logCronError(
  log: CronLogStart,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : "Unknown error"
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - log.startedAt.getTime()

  try {
    await supabaseAdmin
      .from("cron_logs")
      .update({
        status: "failed",
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        error_message: errorMessage,
      })
      .eq("id", log.id)

    console.error(`[CRON LOG] Failed: ${log.jobName} (${log.id}) - ${errorMessage}`)
  } catch (logError) {
    console.error(`[CRON LOG] Failed to update error log:`, logError)
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
      sent_at: getPakistanISOString(),
    })
  } catch (error) {
    console.error("[WELCOME LOG] Failed to log welcome message:", error)
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
      sent_at: getPakistanISOString(),
    }))

    await supabaseAdmin.from("welcome_message_logs").insert(rows)
  } catch (error) {
    console.error("[WELCOME LOG] Failed to log welcome messages:", error)
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
      console.error("[CRON LOG] Failed to fetch logs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[CRON LOG] Failed to fetch logs:", error)
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
      console.error("[WELCOME LOG] Failed to fetch logs:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[WELCOME LOG] Failed to fetch logs:", error)
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