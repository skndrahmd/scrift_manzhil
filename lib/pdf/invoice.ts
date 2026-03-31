/**
 * @module lib/pdf/invoice
 * Invoice PDF generation for maintenance payments and hall bookings.
 * Produces branded, downloadable invoices with payment status stamps.
 */

import type { Booking, MaintenancePayment, Profile } from "@/lib/supabase"
import {
  drawGridTwoColumn,
  drawModernHeader,
  drawPageFooter,
  drawSectionTitle,
  drawStatCard,
  formatCurrency,
  formatCurrencyWith,
  formatDate,
  hexToRgb,
  loadPdfLibs,
  PDF_COLORS,
} from "./theme"
import { getInstanceSettings } from "@/lib/instance-settings"

export { formatCurrency }

type OutstandingSummary = {
  totalOutstanding: number
  outstandingCount: number
  months: string[]
}

const BRAND_NAME = "Manzhil by Scrift"

function drawStatusStamp(doc: import("jspdf").jsPDF, status: "paid" | "unpaid") {
  const { label, color } =
    status === "paid"
      ? { label: "PAID", color: PDF_COLORS.primary }
      : { label: "UNPAID", color: "#d97706" }

  const pageHeight = doc.internal.pageSize.height
  doc.saveGraphicsState()
  doc.setTextColor(...hexToRgb(color))
  doc.setFont("helvetica", "bold")
  doc.setFontSize(36)

  // Add a border around stamp
  doc.setDrawColor(...hexToRgb(color))
  doc.setLineWidth(1)
  doc.roundedRect(140, pageHeight - 60, 50, 20, 2, 2, "D")

  doc.text(label, 165, pageHeight - 48, { align: "center" })
  doc.restoreGraphicsState()
}

function drawOutstandingSummary(
  doc: import("jspdf").jsPDF,
  topY: number,
  summary: OutstandingSummary | undefined,
  currencySymbol: string,
): number {
  if (!summary || summary.outstandingCount === 0) {
    return topY
  }

  const text = `Outstanding: ${formatCurrencyWith(summary.totalOutstanding, currencySymbol)} (${summary.outstandingCount} pending)`
  const height = 14

  doc.setFillColor("#FEF3C7") // Amber 50
  doc.roundedRect(14, topY + 6, 182, height, 1, 1, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor("#B45309") // Amber 700
  doc.text(text.toUpperCase(), 20, topY + 15)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(...hexToRgb(PDF_COLORS.text.primary))

  return topY + height + 8
}

function addPaymentDetailsTable(
  doc: import("jspdf").jsPDF,
  autoTable: any,
  rows: Array<Record<string, string>>,
  startY: number,
) {
  autoTable(doc, {
    startY,
    head: [
      [
        { content: "DESCRIPTION", styles: { textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold" } },
        { content: "AMOUNT / DETAILS", styles: { textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold", halign: "right" } },
      ],
    ],
    body: rows.map((row) => [row.label, row.value]),
    styles: {
      font: "helvetica",
      fontSize: 10,
      textColor: hexToRgb(PDF_COLORS.text.secondary),
      cellPadding: 6,
      lineColor: hexToRgb(PDF_COLORS.border.light),
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 255, 255], // White header
      lineWidth: 0, // No border on header itself
    },
    alternateRowStyles: {
      fillColor: "#F9FAFB",
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: "auto", halign: "right", fontStyle: "bold" },
    },
  })
}

function safeName(value: string | null | undefined) {
  return value?.trim() || "Resident"
}

function safeApartment(value: string | null | undefined) {
  return value?.trim() ? `Apartment ${value}` : "—"
}

/**
 * Generates a deterministic invoice number for a maintenance payment.
 * @param payment - Maintenance payment record
 * @returns Invoice number string in the format "MT-YYYYMM-XXXXXX"
 */
export function getMaintenanceInvoiceNumber(payment: MaintenancePayment) {
  const month = String(payment.month ?? 0).padStart(2, "0")
  const suffix =
    typeof payment.id === "string" ? payment.id.slice(-6).toUpperCase() : String(payment.id ?? 0).padStart(6, "0")
  return `MT-${payment.year ?? "0000"}${month}-${suffix}`
}

/**
 * Generates a deterministic invoice number for a hall booking.
 * @param booking - Booking record
 * @returns Invoice number string in the format "BK-YYYYMMDD-XXXXXX"
 */
export function getBookingInvoiceNumber(booking: Booking) {
  const datePart = booking.booking_date ? booking.booking_date.replaceAll("-", "") : "00000000"
  const suffix =
    typeof booking.id === "string" ? booking.id.slice(-6).toUpperCase() : String(booking.id ?? 0).padStart(6, "0")
  return `BK-${datePart}-${suffix}`
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

/**
 * Generates a full maintenance invoice PDF with billing details and payment status.
 * @param payment - Maintenance payment record (optionally joined with profile)
 * @param summary - Optional outstanding dues summary for unpaid invoices
 * @returns Object containing the PDF blob and suggested file name
 */
export async function generateMaintenanceInvoicePdf(
  payment: MaintenancePayment & { profiles?: Partial<Profile> | null },
  summary?: OutstandingSummary,
) {
  const [{ jsPDF, autoTable }, { currencySymbol }] = await Promise.all([loadPdfLibs(), getInstanceSettings()])
  const fmt = (n: number) => formatCurrencyWith(n, currencySymbol)
  const doc = new jsPDF()

  // 1. Header
  const invoiceNumber = getMaintenanceInvoiceNumber(payment)
  const nextY = await drawModernHeader(doc, "Maintenance Invoice", invoiceNumber, formatDate(payment.created_at))

  const profile = payment.profiles ?? {}
  const billingPeriod = payment.month
    ? new Date(payment.year ?? new Date().getFullYear(), (payment.month ?? 1) - 1, 1).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    })
    : "—"

  // 2. Two Column Grid (Bill To / Bill From)
  const leftData = [
    { label: "FROM", value: "Manzhil by Scrift" },
    // { label: "ADDRESS", value: "Capital Enclave, Islamabad" },
    { label: "EMAIL", value: "support@manzhil.com" }
  ]

  const rightData = [
    { label: "BILL TO", value: safeName(profile.name) },
    { label: "APARTMENT", value: safeApartment(profile.apartment_number) },
    { label: "PHONE", value: profile.phone_number || "—" }
  ]

  const gridBottomY = drawGridTwoColumn(doc, nextY + 10, leftData, rightData)

  // 3. Stat Highlight (Total Amount)
  const isPaid = payment.status === "paid"
  const amountStr = isPaid
    ? fmt(payment.amount ?? profile.maintenance_charges ?? 0)
    : fmt(summary?.totalOutstanding ?? 0)

  drawStatCard(doc, "Amount Due", amountStr, 14, gridBottomY + 15, 60, isPaid ? PDF_COLORS.secondary : "#F59E0B")

  // 4. Invoice Details Table
  addPaymentDetailsTable(
    doc,
    autoTable,
    [
      {
        label: "Billing Period",
        value: isPaid ? billingPeriod : (summary?.months?.join(", ") ?? billingPeriod),
      },
      {
        label: "Reference ID",
        value: payment.payment_reference ?? "—",
      },
      {
        label: "Payment Status",
        value: (payment.status ?? "unpaid").toUpperCase(),
      },
      {
        label: isPaid ? "Total Paid" : "Total Outstanding",
        value: amountStr
      }
    ],
    gridBottomY + 45,
  )

  const tableBottom = (doc as any).lastAutoTable?.finalY ?? 150
  const afterSummary = isPaid ? tableBottom : drawOutstandingSummary(doc, tableBottom, summary, currencySymbol)

  // 5. Notes Section
  const notesY = afterSummary + 10
  drawSectionTitle(doc, "Notes", notesY)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...hexToRgb(PDF_COLORS.text.secondary))
  doc.text(
    "Thank you for your prompt payment which helps us maintain our community standards.",
    14,
    notesY + 6,
    { maxWidth: 120 }
  )

  // 6. Status Stamp
  const statusForStamp = payment.status === "paid" ? "paid" : "unpaid"
  drawStatusStamp(doc, statusForStamp)

  // 7. Footer
  drawPageFooter(doc)

  const fileName = `maintenance-invoice-${invoiceNumber}.pdf`
  const blob = doc.output("blob")

  return { blob, fileName }
}

/**
 * Generates a hall booking invoice PDF with event details and payment status.
 * @param booking - Booking record (optionally joined with profile)
 * @returns Object containing the PDF blob and suggested file name
 */
export async function generateBookingInvoicePdf(booking: any) {
  const [{ jsPDF, autoTable }, { currencySymbol }] = await Promise.all([loadPdfLibs(), getInstanceSettings()])
  const fmt = (n: number) => formatCurrencyWith(n, currencySymbol)
  const doc = new jsPDF()

  // 1. Header
  const invoiceNumber = getBookingInvoiceNumber(booking)
  const nextY = await drawModernHeader(doc, "Booking Invoice", invoiceNumber, formatDate(booking.created_at))

  const profile = booking.profiles ?? {}

  // 2. Two Column Grid
  const leftData = [
    { label: "FROM", value: "Manzhil Community Hall" },
    { label: "EMAIL", value: "bookings@manzhil.com" }
  ]

  const rightData = [
    { label: "BILL TO", value: safeName(profile.name) },
    { label: "APARTMENT", value: safeApartment(profile.apartment_number) },
    { label: "PHONE", value: profile.phone_number || "—" }
  ]

  const gridBottomY = drawGridTwoColumn(doc, nextY + 10, leftData, rightData)

  // 3. Stat Highlight (Total Amount)
  const amountStr = fmt(booking.booking_charges ?? 0)
  drawStatCard(doc, "Total Charges", amountStr, 14, gridBottomY + 15, 60)

  // 4. Details Table
  const rows: Array<Record<string, string>> = [
    { label: "Event Date", value: formatDate(booking.booking_date) },
    { label: "Time Slot", value: buildBookingTimeRange(booking) },
    { label: "Booking Status", value: (booking.status ?? "pending").replaceAll("-", " ").toUpperCase() },
    { label: "Payment Status", value: (booking.payment_status ?? "pending").replaceAll("-", " ").toUpperCase() },
    { label: "Reference ID", value: booking.payment_reference ?? "—" },
    { label: "Total Amount", value: amountStr },
  ]

  addPaymentDetailsTable(doc, autoTable, rows, gridBottomY + 45)

  // 5. Notes
  const tableBottom = (doc as any).lastAutoTable?.finalY ?? 150
  const notesY = tableBottom + 10

  drawSectionTitle(doc, "Terms & Conditions", notesY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...hexToRgb(PDF_COLORS.text.secondary))
  const notes = [
    "• Please present this invoice at the security desk for hall access.",
    "• Cancellations must be made at least 24 hours in advance.",
    "• Any damages to the property will be charged to the resident account."
  ]
  doc.text(notes, 14, notesY + 6)

  // 6. Stamp
  const stampStatus = booking.status === "cancelled" ? "unpaid" : booking.payment_status === "paid" ? "paid" : "unpaid"
  drawStatusStamp(doc, stampStatus)

  // 7. Footer
  drawPageFooter(doc)

  const fileName = `booking-invoice-${invoiceNumber}.pdf`
  const blob = doc.output("blob")

  return { blob, fileName }
}
