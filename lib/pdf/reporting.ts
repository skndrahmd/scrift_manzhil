// Pure reporting utilities (no external deps)

export type Period = "all" | "daily" | "weekly" | "monthly" | "yearly"

export function periodLabel(period: Period): string {
  switch (period) {
    case "daily":
      return "Today"
    case "weekly":
      return "This Week"
    case "monthly":
      return "This Month"
    case "yearly":
      return "This Year"
    default:
      return "All Time"
  }
}

function toDate(value?: string | Date): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  // Accept ISO date (YYYY-MM-DD) or full ISO timestamps
  const iso = value.length === 10 ? `${value}T00:00:00` : value
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export function filterByPeriod<T>(items: T[], period: Period, getDate?: (row: T) => string | Date | undefined): T[] {
  if (period === "all") return items
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const start = new Date(now)
  switch (period) {
    case "daily": {
      start.setHours(0, 0, 0, 0)
      break
    }
    case "weekly": {
      // last 7 days including today
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      break
    }
    case "monthly": {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    }
    case "yearly": {
      start.setMonth(0, 1) // Jan 1
      start.setHours(0, 0, 0, 0)
      break
    }
  }

  return items.filter((row) => {
    const raw = getDate ? getDate(row) : (row as any)?.date || (row as any)?.booking_date || (row as any)?.created_at
    const d = toDate(raw)
    return d ? d >= start && d <= end : false
  })
}

// export { type } from "./pdf"
