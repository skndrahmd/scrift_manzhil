"use client"

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

export function filterByPeriod<T extends { date?: string; created_at?: string; booking_date?: string }>(
  items: T[],
  period: Period,
  getDate?: (row: T) => string, // return YYYY-MM-DD
) {
  if (period === "all") return items

  const today = new Date()
  const end = new Date(today)
  end.setHours(23, 59, 59, 999)

  const start = new Date(today)

  switch (period) {
    case "daily":
      start.setHours(0, 0, 0, 0)
      break
    case "weekly":
      start.setDate(today.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      break
    case "monthly":
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case "yearly":
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
  }

  return items.filter((row) => {
    const iso =
      getDate?.(row) || (row as any).date || (row as any).booking_date || (row as any).created_at?.slice(0, 10)
    if (!iso) return false
    const target = iso.length === 10 ? `${iso}T00:00:00` : iso
    const d = new Date(target)
    return !Number.isNaN(d.getTime()) && d >= start && d <= end
  })
}

export async function exportToPdf({
  title,
  periodLabel: periodText,
  columns,
  rows,
  filtersSummary,
  fileName,
}: {
  title: string
  periodLabel: string
  columns: { header: string; dataKey: string }[]
  rows: any[]
  filtersSummary?: string
  fileName: string
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])

  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(title, 14, 16)

  doc.setFontSize(10)
  doc.text(`Period: ${periodText}`, 14, 24)
  if (filtersSummary) {
    doc.text(`Filters: ${filtersSummary}`, 14, 30)
  }

  autoTable(doc, {
    startY: filtersSummary ? 36 : 32,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(r[c.dataKey] ?? ""))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 120, 220] },
  })

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`)
}
