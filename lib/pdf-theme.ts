import { type jsPDF } from "jspdf"
import "jspdf-autotable"

// Modern Minimalist Palette
export const PDF_COLORS = {
    primary: "#075E54", // Manzhil Deep Teal
    secondary: "#128C7E", // Manzhil Lighter Teal
    accent: "#25D366", // Bright Accent

    text: {
        primary: "#111827", // Almost Black (headings)
        secondary: "#374151", // Dark Gray (body)
        tertiary: "#6B7280", // Light Gray (labels)
        muted: "#9CA3AF", // Disabled/Ultra light
    },

    bg: {
        white: "#FFFFFF",
        subtle: "#F9FAFB", // Very light gray (alternating rows)
        highlight: "#F0FDF9", // Light teal tint
    },

    border: {
        light: "#E5E7EB", // Standard divider
        medium: "#D1D5DB",
    }
}

export type PdfLibs = {
    jsPDF: typeof import("jspdf").jsPDF
    autoTable: (doc: import("jspdf").jsPDF, options: any) => void
}

let pdfLibsPromise: Promise<PdfLibs> | null = null

export async function loadPdfLibs(): Promise<PdfLibs> {
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

export function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0]
}

export function formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString("en-PK")}`
}

export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "—"
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

// ------------------------------------------------------------------
// Modern Drawing Primitives
// ------------------------------------------------------------------

let logoDataUrl: string | null = null

async function getImageDataUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url)
        const blob = await response.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve("") // Fail gracefully
            reader.readAsDataURL(blob)
        })
    } catch (e) {
        return ""
    }
}

export async function drawModernHeader(
    doc: jsPDF,
    docType: string,
    id: string,
    date: string
) {
    // 1. Logo
    if (!logoDataUrl) {
        logoDataUrl = await getImageDataUrl("/manzhil_logo-no_bg.png")
    }

    if (logoDataUrl) {
        try {
            // Logo file is 500x500 (square), use 1:1 aspect ratio
            doc.addImage(logoDataUrl, "PNG", 14, 12, 20, 20)
        } catch (e) {
            // Fallback font logo
            doc.setFontSize(20).setFont("helvetica", "bold").setTextColor(...hexToRgb(PDF_COLORS.primary))
            doc.text("Manzhil", 14, 25)
        }
    } else {
        doc.setFontSize(20).setFont("helvetica", "bold").setTextColor(...hexToRgb(PDF_COLORS.primary))
        doc.text("Manzhil", 14, 25)
    }

    // 2. Right Side: Doc Type
    doc.setFont("helvetica", "bold")
    doc.setFontSize(24)
    doc.setTextColor(...hexToRgb(PDF_COLORS.text.primary)) // Dark Slate
    doc.text(docType.toUpperCase(), 196, 25, { align: "right" })

    // 3. Sub-details (ID & Date)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...hexToRgb(PDF_COLORS.text.tertiary))

    // Aligned right under the title
    doc.text(`#${id}`, 196, 32, { align: "right" })
    doc.text(`${date}`, 196, 37, { align: "right" })

    // 4. Subtle separator
    doc.setDrawColor(...hexToRgb(PDF_COLORS.border.light))
    doc.setLineWidth(0.1)
    doc.line(14, 45, 196, 45)

    return 55 // Return Y position for next element
}

export function drawSectionTitle(doc: jsPDF, title: string, y: number) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...hexToRgb(PDF_COLORS.secondary)) // Teal
    // tracking-widest simulation by adding spaces? No, standard jsPDF doesn't support tracking easily without advanced API. 
    // We'll use Uppercase + Color to distinguish.
    doc.text(title.toUpperCase(), 14, y)
    return y + 6
}

export function drawGridTwoColumn(
    doc: jsPDF,
    y: number,
    leftData: { label: string; value: string }[],
    rightData: { label: string; value: string }[]
) {
    const startY = y
    const leftX = 14
    const rightX = 110 // Center-ish
    const lineHeight = 6
    const labelOffset = 30 // Width reserved for label

    // Left Column
    let currentY = startY
    leftData.forEach(item => {
        // Label
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...hexToRgb(PDF_COLORS.text.tertiary))
        doc.text(item.label, leftX, currentY)

        // Value
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(...hexToRgb(PDF_COLORS.text.secondary))
        // If value is long, we might need wrapping, but assuming short for invoice headers
        doc.text(item.value, leftX, currentY + 4)

        currentY += 12 // Spacing
    })

    // Right Column
    currentY = startY
    rightData.forEach(item => {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...hexToRgb(PDF_COLORS.text.tertiary))
        doc.text(item.label, rightX, currentY)

        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(...hexToRgb(PDF_COLORS.text.secondary))
        doc.text(item.value, rightX, currentY + 4)

        currentY += 12
    })

    // Return the lowest Y point
    return Math.max(startY + (leftData.length * 12), startY + (rightData.length * 12))
}

export function drawStatCard(doc: jsPDF, label: string, value: string, x: number, y: number, width: number, accentColor: string = PDF_COLORS.secondary) {
    // Background
    // doc.setFillColor(...hexToRgb(PDF_COLORS.bg.subtle))
    // doc.roundedRect(x, y, width, 20, 2, 2, "F")

    // Left Accent Border
    doc.setDrawColor(...hexToRgb(accentColor))
    doc.setLineWidth(1)
    doc.line(x, y, x, y + 18)

    // Label
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...hexToRgb(PDF_COLORS.text.tertiary))
    doc.text(label.toUpperCase(), x + 3, y + 6)

    // Value
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(...hexToRgb(PDF_COLORS.text.primary))
    doc.text(value, x + 3, y + 14)
}

export function drawPageFooter(doc: jsPDF, pageNumber?: number, totalPages?: number) {
    const pageHeight = doc.internal.pageSize.height
    const width = doc.internal.pageSize.width

    doc.setDrawColor(...hexToRgb(PDF_COLORS.border.light))
    doc.setLineWidth(0.1)
    doc.line(14, pageHeight - 15, width - 14, pageHeight - 15)

    doc.setFontSize(8)
    doc.setTextColor(...hexToRgb(PDF_COLORS.text.tertiary))

    const now = new Date().toLocaleString("en-PK")
    doc.text(`Generated by Manzhil System • ${now}`, 14, pageHeight - 8)

    // Manzhil Brand simple text
    doc.setFont("helvetica", "bold")
    doc.text("Manzhil", width / 2, pageHeight - 8, { align: "center" })

    if (pageNumber) {
        const text = totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`
        doc.setFont("helvetica", "normal")
        doc.text(text, width - 14, pageHeight - 8, { align: "right" })
    }
}

// Backward compatibility (deprecated but kept to prevent crashing if I miss a file)
export const drawBrandHeader = (doc: jsPDF, title: string, sub: string) => drawModernHeader(doc, title, "", sub)
export const drawSectionHeader = (doc: jsPDF, title: string, y: number) => drawSectionTitle(doc, title, y)
