/**
 * @module supabase/constants
 * Application constants including RBAC page key definitions, broadcast
 * rate limiting configuration, and related type exports.
 */
import type { PageKey } from "./types"

export const PAGE_KEYS: { key: PageKey; label: string; route: string }[] = [
  { key: "dashboard", label: "Dashboard", route: "/admin/dashboard" },
  { key: "residents", label: "Residents", route: "/admin" },
  { key: "units", label: "Units", route: "/admin/units" },
  { key: "bookings", label: "Bookings", route: "/admin/bookings" },
  { key: "complaints", label: "Complaints", route: "/admin/complaints" },
  { key: "visitors", label: "Visitors", route: "/admin/visitors" },
  { key: "parcels", label: "Parcels", route: "/admin/parcels" },
  { key: "analytics", label: "Analytics", route: "/admin/analytics" },
  { key: "feedback", label: "Feedback", route: "/admin/feedback" },
  { key: "accounting", label: "Accounting", route: "/admin/accounting" },
  { key: "broadcast", label: "Broadcast", route: "/admin/broadcast" },
  { key: "settings", label: "Settings", route: "/admin/settings" },
]

// Broadcast Rate Limiting Types

export type BroadcastLog = {
  id: string
  sent_at: string
  recipient_count: number
  success_count: number
  failed_count: number
  message_title: string | null
  message_body: string | null
  created_by: string | null
}

// Rate limiting constants
export const BROADCAST_LIMITS = {
  DAILY_MESSAGE_LIMIT: 250,       // Max messages per 24 hours
  MESSAGE_DELAY_MS: 3000,         // 3 seconds between messages
  BATCH_SIZE: 20,                 // Messages per batch
  BATCH_DELAY_MS: 30000,          // 30 seconds between batches
  MIN_BROADCAST_INTERVAL_MS: 0, // Disabled (was 15 minutes between broadcasts)
  SOFT_RECIPIENT_LIMIT: 50,       // Show warning above this
  HARD_RECIPIENT_LIMIT: 100,      // Require confirmation above this
}
