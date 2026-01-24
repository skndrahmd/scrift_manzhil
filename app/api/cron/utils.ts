import { supabase } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"

export function todayISODate(): string {
  const now = new Date(getPakistanISOString())
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

export async function getActiveProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from("profiles").select("*").eq("is_active", true)
  return data || []
}

export async function ensureCurrentMonthRows(profiles: Profile[]) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Fetch existing rows for current month
  const { data: existing } = await supabase
    .from("maintenance_payments")
    .select("profile_id, year, month")
    .eq("year", year)
    .eq("month", month)

  const existingKey = new Set((existing || []).map((r) => `${r.profile_id}-${r.year}-${r.month}`))

  const payload = profiles
    .filter((p) => !existingKey.has(`${p.id}-${year}-${month}`))
    .map((p) => ({
      profile_id: p.id,
      year,
      month,
      amount: p.maintenance_charges ?? 0,
      status: "unpaid",
    }))

  if (payload.length > 0) {
    await supabase.from("maintenance_payments").insert(payload)
  }
}

export async function markOverduePastMonths() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Set overdue for all months strictly before current month that are still unpaid
  await supabase
    .from("maintenance_payments")
    .update({ status: "overdue", updated_at: getPakistanISOString() })
    .lt("year", currentYear)
    .neq("status", "paid")

  await supabase
    .from("maintenance_payments")
    .update({ status: "overdue", updated_at: getPakistanISOString() })
    .eq("year", currentYear)
    .lt("month", currentMonth)
    .neq("status", "paid")
}
