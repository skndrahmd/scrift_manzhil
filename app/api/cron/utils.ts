import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanTime, getPakistanISOString } from "@/lib/date"

export async function todayISODate(): Promise<string> {
  const now = await getPakistanTime()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function isSameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  return a.slice(0, 10) === b.slice(0, 10)
}

export function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleString("en-US", { month: "long", year: "numeric" })
}

export function yyyymmCompare(a: { year: number; month: number }, b: { year: number; month: number }) {
  if (a.year !== b.year) return a.year - b.year
  return a.month - b.month
}

export async function markOverduePastMonths() {
  const now = await getPakistanTime()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const isoNow = await getPakistanISOString()

  // Set overdue for all months strictly before current month that are still unpaid
  await supabaseAdmin
    .from("maintenance_payments")
    .update({ status: "overdue", updated_at: isoNow })
    .lt("year", currentYear)
    .neq("status", "paid")

  await supabaseAdmin
    .from("maintenance_payments")
    .update({ status: "overdue", updated_at: isoNow })
    .eq("year", currentYear)
    .lt("month", currentMonth)
    .neq("status", "paid")
}
