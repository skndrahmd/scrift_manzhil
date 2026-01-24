"use client"

import type { FinancialSummary, Expense, ExpenseCategory } from "@/lib/supabase"

const BRAND_NAME = "Greens Three"
const BRAND_PRIMARY = "#047857"

type PdfLibs = {
    jsPDF: typeof import("jspdf").jsPDF
    autoTable: (doc: import("jspdf").jsPDF, options: any) => void
}

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

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0]
}

function formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString("en-PK")}`
}

function drawHeader(doc: import("jspdf").jsPDF, title: string, year: number) {
    // Brand header
    doc.setFillColor(...hexToRgb(BRAND_PRIMARY))
    doc.rect(0, 0, 220, 25, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(BRAND_NAME, 14, 16)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Financial Year: ${year}`, 196, 16, { align: "right" })

    // Title
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(title, 14, 38)

    // Generated date
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })}`, 196, 38, { align: "right" })
}

function drawFooter(doc: import("jspdf").jsPDF) {
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`${BRAND_NAME} - Building Management System`, 105, pageHeight - 10, { align: "center" })
}

// Income Statement Report
export async function generateIncomeStatementPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    drawHeader(doc, "Income Statement", year)

    // Summary cards
    const summaryY = 50
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    const summaryData = [
        { label: "Total Revenue", value: formatCurrency(summary.totalRevenue), color: "#10b981" },
        { label: "Total Expenses", value: formatCurrency(summary.totalExpenses), color: "#f59e0b" },
        { label: "Net Income", value: formatCurrency(summary.netIncome), color: summary.netIncome >= 0 ? "#10b981" : "#ef4444" },
    ]

    let xPos = 14
    summaryData.forEach((item) => {
        doc.setFillColor(...hexToRgb("#f3f4f6"))
        doc.roundedRect(xPos, summaryY, 55, 20, 2, 2, "F")
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(item.label, xPos + 5, summaryY + 7)
        doc.setFontSize(11)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...hexToRgb(item.color))
        doc.text(item.value, xPos + 5, summaryY + 15)
        doc.setFont("helvetica", "normal")
        xPos += 60
    })

    // Monthly breakdown table
    const tableData = summary.monthlyData.map((m) => [
        m.month,
        formatCurrency(m.bookingIncome),
        formatCurrency(m.maintenanceIncome),
        formatCurrency(m.bookingIncome + m.maintenanceIncome),
        formatCurrency(m.expenses),
        formatCurrency(m.bookingIncome + m.maintenanceIncome - m.expenses),
    ])

    autoTable(doc, {
        startY: summaryY + 30,
        head: [["Month", "Booking Income", "Maintenance", "Total Income", "Expenses", "Net"]],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: hexToRgb(BRAND_PRIMARY) },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        foot: [[
            "TOTAL",
            formatCurrency(summary.bookingRevenue),
            formatCurrency(summary.maintenanceRevenue),
            formatCurrency(summary.totalRevenue),
            formatCurrency(summary.totalExpenses),
            formatCurrency(summary.netIncome),
        ]],
    })

    drawFooter(doc)
    doc.save(`income_statement_${year}.pdf`)
}

// Collection Report
export async function generateCollectionReportPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    drawHeader(doc, "Collection Report", year)

    // Overall collection rate
    const rateY = 50
    doc.setFillColor(...hexToRgb("#dbeafe"))
    doc.roundedRect(14, rateY, 80, 25, 3, 3, "F")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text("Overall Collection Rate", 20, rateY + 9)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...hexToRgb("#3b82f6"))
    doc.text(`${summary.collectionRate.toFixed(1)}%`, 20, rateY + 20)
    doc.setFont("helvetica", "normal")

    // Outstanding dues box
    doc.setFillColor(...hexToRgb("#fef3c7"))
    doc.roundedRect(100, rateY, 80, 25, 3, 3, "F")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text("Outstanding Dues", 106, rateY + 9)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...hexToRgb("#f59e0b"))
    doc.text(formatCurrency(summary.outstandingDues), 106, rateY + 20)
    doc.setFont("helvetica", "normal")

    // Monthly collection table
    const tableData = summary.monthlyData.map((m) => {
        const totalIncome = m.bookingIncome + m.maintenanceIncome
        return [
            m.month,
            formatCurrency(totalIncome),
            totalIncome > 0 ? "100%" : "0%",
        ]
    })

    autoTable(doc, {
        startY: rateY + 35,
        head: [["Month", "Amount Collected", "Collection Rate"]],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: hexToRgb(BRAND_PRIMARY) },
    })

    drawFooter(doc)
    doc.save(`collection_report_${year}.pdf`)
}

// Expense Report
export async function generateExpenseReportPdf(
    expenses: Expense[],
    categories: ExpenseCategory[],
    year: number
) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    drawHeader(doc, "Expense Report", year)

    // Group expenses by category
    const categoryTotals: Record<string, { name: string; amount: number; color: string }> = {}
    let totalExpenses = 0

    expenses.forEach((expense) => {
        const category = categories.find((c) => c.id === expense.category_id)
        const catId = expense.category_id || "uncategorized"
        const catName = category?.name || "Uncategorized"
        const catColor = category?.color || "#6b7280"

        if (!categoryTotals[catId]) {
            categoryTotals[catId] = { name: catName, amount: 0, color: catColor }
        }
        categoryTotals[catId].amount += expense.amount
        totalExpenses += expense.amount
    })

    // Total expenses box
    const summaryY = 50
    doc.setFillColor(...hexToRgb("#fef2f2"))
    doc.roundedRect(14, summaryY, 100, 25, 3, 3, "F")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text("Total Expenses", 20, summaryY + 9)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...hexToRgb("#ef4444"))
    doc.text(formatCurrency(totalExpenses), 20, summaryY + 20)
    doc.setFont("helvetica", "normal")

    // Category breakdown table
    const tableData = Object.values(categoryTotals)
        .sort((a, b) => b.amount - a.amount)
        .map((cat) => [
            cat.name,
            formatCurrency(cat.amount),
            totalExpenses > 0 ? `${((cat.amount / totalExpenses) * 100).toFixed(1)}%` : "0%",
        ])

    autoTable(doc, {
        startY: summaryY + 35,
        head: [["Category", "Amount", "% of Total"]],
        body: tableData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: hexToRgb(BRAND_PRIMARY) },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        foot: [["TOTAL", formatCurrency(totalExpenses), "100%"]],
    })

    // Detailed expense list
    if (expenses.length > 0) {
        const detailY = (doc as any).lastAutoTable.finalY + 15
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("Expense Details", 14, detailY)

        const detailData = expenses
            .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
            .slice(0, 20)
            .map((e) => {
                const cat = categories.find((c) => c.id === e.category_id)
                return [
                    new Date(e.expense_date).toLocaleDateString("en-PK", { day: "2-digit", month: "short" }),
                    cat?.name || "Other",
                    e.description.substring(0, 30),
                    e.vendor_name || "-",
                    formatCurrency(e.amount),
                ]
            })

        autoTable(doc, {
            startY: detailY + 5,
            head: [["Date", "Category", "Description", "Vendor", "Amount"]],
            body: detailData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: hexToRgb("#6b7280") },
        })
    }

    drawFooter(doc)
    doc.save(`expense_report_${year}.pdf`)
}

// Outstanding Dues Report
export async function generateOutstandingDuesPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    drawHeader(doc, "Outstanding Dues Report", year)

    // Summary
    const summaryY = 50
    doc.setFillColor(...hexToRgb("#fef3c7"))
    doc.roundedRect(14, summaryY, 120, 25, 3, 3, "F")
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text("Total Outstanding Amount", 20, summaryY + 9)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...hexToRgb("#f59e0b"))
    doc.text(formatCurrency(summary.outstandingDues), 20, summaryY + 20)
    doc.setFont("helvetica", "normal")

    // Note about data
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(
        "Note: Detailed outstanding dues by resident are available in the Residents tab.",
        14,
        summaryY + 40
    )

    // Collection rate info
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text("Collection Statistics", 14, summaryY + 55)

    autoTable(doc, {
        startY: summaryY + 60,
        head: [["Metric", "Value"]],
        body: [
            ["Total Revenue Collected", formatCurrency(summary.totalRevenue)],
            ["Outstanding Dues", formatCurrency(summary.outstandingDues)],
            ["Collection Rate", `${summary.collectionRate.toFixed(1)}%`],
            ["Expected Total", formatCurrency(summary.totalRevenue + summary.outstandingDues)],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: hexToRgb(BRAND_PRIMARY) },
        columnStyles: {
            0: { fontStyle: "bold" },
        },
    })

    drawFooter(doc)
    doc.save(`outstanding_dues_${year}.pdf`)
}

// Annual Summary Report
export async function generateAnnualSummaryPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    drawHeader(doc, "Annual Financial Summary", year)

    // Key metrics boxes
    const metrics = [
        { label: "Total Revenue", value: formatCurrency(summary.totalRevenue), color: "#10b981", bg: "#d1fae5" },
        { label: "Total Expenses", value: formatCurrency(summary.totalExpenses), color: "#f59e0b", bg: "#fef3c7" },
        { label: "Net Income", value: formatCurrency(summary.netIncome), color: summary.netIncome >= 0 ? "#10b981" : "#ef4444", bg: summary.netIncome >= 0 ? "#d1fae5" : "#fee2e2" },
        { label: "Collection Rate", value: `${summary.collectionRate.toFixed(1)}%`, color: "#3b82f6", bg: "#dbeafe" },
    ]

    let y = 50
    let x = 14
    metrics.forEach((m, i) => {
        if (i === 2) { x = 14; y += 30 }
        doc.setFillColor(...hexToRgb(m.bg))
        doc.roundedRect(x, y, 88, 25, 3, 3, "F")
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(m.label, x + 5, y + 9)
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...hexToRgb(m.color))
        doc.text(m.value, x + 5, y + 19)
        doc.setFont("helvetica", "normal")
        x += 93
    })

    // Revenue breakdown
    y += 40
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.text("Revenue Breakdown", 14, y)
    doc.setFont("helvetica", "normal")

    autoTable(doc, {
        startY: y + 5,
        head: [["Source", "Amount", "% of Total"]],
        body: [
            ["Booking Revenue", formatCurrency(summary.bookingRevenue), summary.totalRevenue > 0 ? `${((summary.bookingRevenue / summary.totalRevenue) * 100).toFixed(1)}%` : "0%"],
            ["Maintenance Revenue", formatCurrency(summary.maintenanceRevenue), summary.totalRevenue > 0 ? `${((summary.maintenanceRevenue / summary.totalRevenue) * 100).toFixed(1)}%` : "0%"],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: hexToRgb(BRAND_PRIMARY) },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        foot: [["Total Revenue", formatCurrency(summary.totalRevenue), "100%"]],
    })

    // Monthly trend
    const trendY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Monthly Performance", 14, trendY)
    doc.setFont("helvetica", "normal")

    autoTable(doc, {
        startY: trendY + 5,
        head: [["Month", "Income", "Expenses", "Net"]],
        body: summary.monthlyData.map((m) => [
            m.month,
            formatCurrency(m.bookingIncome + m.maintenanceIncome),
            formatCurrency(m.expenses),
            formatCurrency(m.bookingIncome + m.maintenanceIncome - m.expenses),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: hexToRgb("#6b7280") },
    })

    drawFooter(doc)
    doc.save(`annual_summary_${year}.pdf`)
}
