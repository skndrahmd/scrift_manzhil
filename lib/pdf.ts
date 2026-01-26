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

import { drawModernHeader, drawPageFooter, hexToRgb, loadPdfLibs, PDF_COLORS } from "./pdf-theme"

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
  const { jsPDF, autoTable } = await loadPdfLibs()

  const doc = new jsPDF()

  // Use current date for the "Generated" field in header
  const nextY = await drawModernHeader(doc, title, periodText, `Generated ${new Date().toLocaleDateString("en-GB")}`)

  if (filtersSummary) {
    doc.setFontSize(9)
    doc.setTextColor(...hexToRgb(PDF_COLORS.text.tertiary))
    doc.text(`Filters: ${filtersSummary}`, 14, nextY + 5)
  }

  autoTable(doc, {
    startY: filtersSummary ? nextY + 12 : nextY + 8,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(r[c.dataKey] ?? ""))),
    styles: {
      fontSize: 10,
      textColor: hexToRgb(PDF_COLORS.text.secondary),
      cellPadding: 4,
      lineColor: hexToRgb(PDF_COLORS.border.light),
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: hexToRgb(PDF_COLORS.text.tertiary),
      fontStyle: "bold",
      lineWidth: 0
    },
    alternateRowStyles: {
      fillColor: "#F9FAFB"
    }
  })

  drawPageFooter(doc)

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`)
}
