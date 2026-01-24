import type { Booking, MaintenancePayment, Profile } from "@/lib/supabase"

type PdfLibs = {
  jsPDF: typeof import("jspdf").jsPDF
  autoTable: (doc: import("jspdf").jsPDF, options: any) => void
}


type OutstandingSummary = {
  totalOutstanding: number
  outstandingCount: number
  months: string[]
}

const BRAND_NAME = "Manzhil by Scrift"
const BRAND_PRIMARY = "#047857"
const BRAND_ACCENT = "#064e3b"

let pdfLibsPromise: Promise<PdfLibs> | null = null

async function loadPdfLibs(): Promise<PdfLibs> {
  if (!pdfLibsPromise) {
    pdfLibsPromise = Promise.all([
      import("jspdf").then((module) => module.jsPDF),
      import("jspdf-autotable").then((module) => module.default),
    ]).then(([jsPDFConstructor, autoTable]) => ({
      jsPDF: jsPDFConstructor,
      autoTable,
    }))
  }

  return pdfLibsPromise
}

function drawBrandHeader(doc: import("jspdf").jsPDF, title: string) {
  doc.setFillColor(BRAND_PRIMARY)
  doc.rect(0, 0, 210, 30, "F")

  doc.setTextColor("#f9fafb")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text(BRAND_NAME, 14, 19)

  doc.setFontSize(12)
  doc.text(title, 150, 19)

  doc.setDrawColor("#e5e7eb")
  doc.line(10, 36, 200, 36)
  doc.setTextColor("#111827")
}

function drawFooter(doc: import("jspdf").jsPDF) {
  const pageHeight = doc.internal.pageSize.height
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor("#6b7280")
  doc.text(`${BRAND_NAME} · Automated invoice generated on ${formatDate(new Date())}`, 14, pageHeight - 12)
}

function drawStatusStamp(doc: import("jspdf").jsPDF, status: "paid" | "unpaid") {
  const { label, color } =
    status === "paid" ? { label: "PAID", color: "#047857" } : { label: "UNPAID", color: "#d97706" }

  const pageHeight = doc.internal.pageSize.height
  doc.saveGraphicsState()
  doc.setTextColor(color)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(36)
  doc.text(label, 150, pageHeight - 40, { angle: -30 })
  doc.restoreGraphicsState()
}

function drawOutstandingSummary(
  doc: import("jspdf").jsPDF,
  topY: number,
  summary: OutstandingSummary | undefined,
): number {
  if (!summary || summary.outstandingCount === 0) {
    return topY
  }

  const text = `Outstanding dues: ${formatCurrency(summary.totalOutstanding)} across ${summary.outstandingCount} ${
    summary.outstandingCount === 1 ? "invoice" : "invoices"
  }`
  const height = 18

  doc.setFillColor("#fef3c7")
  doc.roundedRect(14, topY + 6, 182, height, 3, 3, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor("#92400e")
  doc.text(text, 20, topY + 18)

  doc.setFont("helvetica", "normal")
  doc.setTextColor("#111827")

  return topY + height + 8
}

function formatOutstandingPeriods(payments: MaintenancePayment[]): string {
  if (!payments.length) return "—"

  return payments
    .map((p) =>
      new Date(p.year ?? new Date().getFullYear(), (p.month ?? 1) - 1, 1).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    )
    .join(", ")
}

function addPaymentDetailsTable(
  doc: import("jspdf").jsPDF,
  autoTable: PdfLibs["autoTable"],
  rows: Array<Record<string, string>>,
  startY: number,
) {
  autoTable(doc, {
    startY,
    head: [
      [
        { content: "Description", styles: { fillColor: hexToRgb(BRAND_PRIMARY), textColor: "#f9fafb" } },
        { content: "Details", styles: { fillColor: hexToRgb(BRAND_PRIMARY), textColor: "#f9fafb" } },
      ],
    ],
    body: rows.map((row) => [row.label, row.value]),
    styles: {
      font: "helvetica",
      fontSize: 11,
      textColor: "#111827",
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: "#f9fafb",
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 100 },
    },
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "")
  const bigint = Number.parseInt(normalized, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function safeName(value: string | null | undefined) {
  return value?.trim() || "Resident"
}

function safeApartment(value: string | null | undefined) {
  return value?.trim() ? `Apartment ${value}` : "—"
}

export function formatCurrency(amount: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function getMaintenanceInvoiceNumber(payment: MaintenancePayment) {
  const month = String(payment.month ?? 0).padStart(2, "0")
  const suffix =
    typeof payment.id === "string" ? payment.id.slice(-6).toUpperCase() : String(payment.id ?? 0).padStart(6, "0")
  return `MT-${payment.year ?? "0000"}${month}-${suffix}`
}

export function getBookingInvoiceNumber(booking: Booking) {
  const datePart = booking.booking_date ? booking.booking_date.replaceAll("-", "") : "00000000"
  const suffix =
    typeof booking.id === "string" ? booking.id.slice(-6).toUpperCase() : String(booking.id ?? 0).padStart(6, "0")
  return `BK-${datePart}-${suffix}`
}

function formatDate(value: string | number | Date | null | undefined) {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatTime(value: string | null | undefined) {
  if (!value) return "--:--"
  const [hoursStr, minutesStr = "00"] = value.split(":")
  const hours = Number.parseInt(hoursStr, 10)
  if (Number.isNaN(hours)) return value
  const period = hours >= 12 ? "PM" : "AM"
  const normalized = hours % 12 === 0 ? 12 : hours % 12
  return `${normalized}:${minutesStr.padStart(2, "0")} ${period}`
}

function buildBookingTimeRange(booking: Booking) {
  if (!booking.start_time || !booking.end_time) return "—"
  return `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
}

export async function generateMaintenanceInvoicePdf(
  payment: MaintenancePayment & { profiles?: Partial<Profile> | null },
  summary?: OutstandingSummary,
) {
  const { jsPDF, autoTable } = await loadPdfLibs()
  const doc = new jsPDF()

  drawBrandHeader(doc, "Maintenance Invoice")

  const invoiceNumber = getMaintenanceInvoiceNumber(payment)
  const profile = payment.profiles ?? {}
  const billingPeriod = payment.month
    ? new Date(payment.year ?? new Date().getFullYear(), (payment.month ?? 1) - 1, 1).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : "—"

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(`Invoice #${invoiceNumber}`, 14, 46)
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`Issued: ${formatDate(payment.created_at)}`, 14, 53)
  // doc.text(
  //   `Due: ${formatDate(payment.due_date ?? new Date(payment.year ?? 2025, (payment.month ?? 1) - 1, 10))}`,
  //   14,
  //   60,
  // )

  doc.setFont("helvetica", "bold")
  doc.text("Resident", 130, 46)
  doc.setFont("helvetica", "normal")
  doc.text(safeName(profile.name), 130, 53)
  doc.text(safeApartment(profile.apartment_number), 130, 60)
  if (profile.phone_number) {
    doc.text(profile.phone_number, 130, 67)
  }

  const isPaid = payment.status === "paid"

  addPaymentDetailsTable(
    doc,
    autoTable,
    [
      {
        label: "Billing Periods",
        value: isPaid ? billingPeriod : (summary?.months?.join(", ") ?? billingPeriod),
      },
      {
        label: "Amount",
        value: isPaid
          ? formatCurrency(payment.amount ?? profile.maintenance_charges ?? 0)
          : formatCurrency(summary?.totalOutstanding ?? 0),
      },
      { label: "Status", value: (payment.status ?? "unpaid").toUpperCase() },
      { label: "Paid On", value: formatDate(payment.paid_date) },
      { label: "Reference", value: payment.payment_reference ?? "—" },
    ],
    78,
  )

  const tableBottom = (doc as any).lastAutoTable?.finalY ?? 98
  const afterSummary = isPaid ? tableBottom : drawOutstandingSummary(doc, tableBottom, summary)

  drawFooter(doc)

  const statusForStamp = payment.status === "paid" ? "paid" : "unpaid"
  drawStatusStamp(doc, statusForStamp)

  doc.setDrawColor(hexToRgb(BRAND_ACCENT)[0], hexToRgb(BRAND_ACCENT)[1], hexToRgb(BRAND_ACCENT)[2])
  doc.roundedRect(14, afterSummary + 4, 182, 30, 3, 3, "S")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Notes", 20, afterSummary + 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("Thank you for keeping your maintenance dues up to date. This invoice was generated by Manzhil by Scrift.", 20, afterSummary + 21)

  const fileName = `maintenance-invoice-${invoiceNumber}.pdf`
  const blob = doc.output("blob")

  return { blob, fileName }
}

// export async function generateBookingInvoicePdf(booking: Booking & { profiles?: Partial<Profile> | null }) {
export async function generateBookingInvoicePdf(booking: any) {

  const { jsPDF, autoTable } = await loadPdfLibs()
  const doc = new jsPDF()

  drawBrandHeader(doc, "Community Hall Booking Invoice")

  const invoiceNumber = getBookingInvoiceNumber(booking)
  const profile = booking.profiles ?? {}

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(`Invoice #${invoiceNumber}`, 14, 46)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text(`Issued: ${formatDate(booking.created_at)}`, 14, 53)
  doc.text(`Event Date: ${formatDate(booking.booking_date)}`, 14, 60)

  doc.setFont("helvetica", "bold")
  doc.text("Resident", 130, 46)
  doc.setFont("helvetica", "normal")
  doc.text(safeName(profile.name), 130, 53)
  doc.text(safeApartment(profile.apartment_number), 130, 60)
  if (profile.phone_number) {
    doc.text(profile.phone_number, 130, 67)
  }

  const rows: Array<Record<string, string>> = [
    { label: "Time Slot", value: buildBookingTimeRange(booking) },
    { label: "Hall Booking Status", value: (booking.status ?? "pending").replaceAll("-", " ").toUpperCase() },
    { label: "Payment Status", value: (booking.payment_status ?? "pending").replaceAll("-", " ").toUpperCase() },
    { label: "Amount", value: formatCurrency(booking.booking_charges ?? 0) },
    { label: "Payment Reference", value: booking.payment_reference ?? "—" },
  ]

  addPaymentDetailsTable(doc, autoTable, rows, 78)

  drawFooter(doc)

  const stampStatus = booking.status === "cancelled" ? "unpaid" : booking.payment_status === "paid" ? "paid" : "unpaid"
  drawStatusStamp(doc, stampStatus)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Notes", 14, 130)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(
    [
      "Please present this invoice during hall check-in.",
      "For any changes, please contact Manzhil by Scrift support.",
    ],
    14,
    137,
  )

  const fileName = `booking-invoice-${invoiceNumber}.pdf`
  const blob = doc.output("blob")

  return { blob, fileName }
}
