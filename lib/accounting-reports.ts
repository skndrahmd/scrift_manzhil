"use client"

import type { FinancialSummary, Expense, ExpenseCategory } from "@/lib/supabase"
import {
    drawGridTwoColumn,
    drawModernHeader,
    drawPageFooter,
    drawSectionTitle,
    drawStatCard,
    formatCurrency,
    formatDate,
    hexToRgb,
    loadPdfLibs,
    PDF_COLORS,
} from "./pdf-theme"

const BRAND_NAME = "Manzhil by Scrift"

// Income Statement Report
export async function generateIncomeStatementPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    const nextY = await drawModernHeader(doc, "Income Statement", `FY-${year}`, `Generated ${formatDate(new Date())}`)

    // Stat Cards Row
    const cardWidth = 55
    const cardGap = 10
    const startX = 14

    drawStatCard(doc, "Total Revenue", formatCurrency(summary.totalRevenue), startX, nextY + 10, cardWidth, "#10B981")
    drawStatCard(doc, "Total Expenses", formatCurrency(summary.totalExpenses), startX + cardWidth + cardGap, nextY + 10, cardWidth, "#F59E0B")

    const netColor = summary.netIncome >= 0 ? "#10B981" : "#EF4444"
    drawStatCard(doc, "Net Income", formatCurrency(summary.netIncome), startX + (cardWidth + cardGap) * 2, nextY + 10, cardWidth, netColor)

    const tableStartY = nextY + 45
    drawSectionTitle(doc, "Monthly Breakdown", tableStartY)

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
        startY: tableStartY + 8,
        head: [["MONTH", "BOOKING IN", "MAINTENANCE", "TOTAL INC", "EXPENSES", "NET INCOME"]],
        body: tableData,
        styles: {
            fontSize: 9,
            textColor: hexToRgb(PDF_COLORS.text.secondary),
            lineColor: hexToRgb(PDF_COLORS.border.light),
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: hexToRgb(PDF_COLORS.text.tertiary),
            fontStyle: "bold",
            lineWidth: 0
        },
        alternateRowStyles: { fillColor: "#F9FAFB" },
        footStyles: { fillColor: "#F3F4F6", textColor: hexToRgb(PDF_COLORS.text.primary), fontStyle: "bold" },
        foot: [[
            "TOTAL",
            formatCurrency(summary.bookingRevenue),
            formatCurrency(summary.maintenanceRevenue),
            formatCurrency(summary.totalRevenue),
            formatCurrency(summary.totalExpenses),
            formatCurrency(summary.netIncome),
        ]],
    })

    drawPageFooter(doc)
    doc.save(`income_statement_${year}.pdf`)
}

// Collection Report
export async function generateCollectionReportPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    const nextY = await drawModernHeader(doc, "Collection Report", `FY-${year}`, `Generated ${formatDate(new Date())}`)

    // Highlights
    drawStatCard(doc, "Collection Rate", `${summary.collectionRate.toFixed(1)}%`, 14, nextY + 10, 80, "#3B82F6")
    drawStatCard(doc, "Outstanding Dues", formatCurrency(summary.outstandingDues), 105, nextY + 10, 80, "#F59E0B")

    const tableStartY = nextY + 45
    drawSectionTitle(doc, "Monthly Collection Performance", tableStartY)

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
        startY: tableStartY + 8,
        head: [["MONTH", "AMOUNT COLLECTED", "COLLECTION RATE"]],
        body: tableData,
        styles: { fontSize: 10, textColor: hexToRgb(PDF_COLORS.text.secondary), cellPadding: 4, lineColor: hexToRgb(PDF_COLORS.border.light), lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold", lineWidth: 0 },
        alternateRowStyles: { fillColor: "#F9FAFB" },
    })

    drawPageFooter(doc)
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

    const nextY = await drawModernHeader(doc, "Expense Report", `FY-${year}`, `Generated ${formatDate(new Date())}`)

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
    drawStatCard(doc, "Total Expenses", formatCurrency(totalExpenses), 14, nextY + 10, 180, "#EF4444")

    const breakdownY = nextY + 45
    drawSectionTitle(doc, "Category Breakdown", breakdownY)

    // Category breakdown table
    const tableData = Object.values(categoryTotals)
        .sort((a, b) => b.amount - a.amount)
        .map((cat) => [
            cat.name,
            formatCurrency(cat.amount),
            totalExpenses > 0 ? `${((cat.amount / totalExpenses) * 100).toFixed(1)}%` : "0%",
        ])

    autoTable(doc, {
        startY: breakdownY + 8,
        head: [["CATEGORY", "AMOUNT", "% OF TOTAL"]],
        body: tableData,
        styles: { fontSize: 10, textColor: hexToRgb(PDF_COLORS.text.secondary), lineColor: hexToRgb(PDF_COLORS.border.light), lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold", lineWidth: 0 },
        alternateRowStyles: { fillColor: "#F9FAFB" },
        footStyles: { fillColor: "#F3F4F6", textColor: hexToRgb(PDF_COLORS.text.primary), fontStyle: "bold" },
        foot: [["TOTAL", formatCurrency(totalExpenses), "100%"]],
    })

    // Detailed expense list
    if (expenses.length > 0) {
        const detailY = (doc as any).lastAutoTable.finalY + 15
        drawSectionTitle(doc, "Expense Details", detailY)

        const detailData = expenses
            .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
            .slice(0, 50)
            .map((e) => {
                const cat = categories.find((c) => c.id === e.category_id)
                return [
                    formatDate(e.expense_date),
                    cat?.name || "Other",
                    e.description.substring(0, 40),
                    e.vendor_name || "-",
                    formatCurrency(e.amount),
                ]
            })

        autoTable(doc, {
            startY: detailY + 8,
            head: [["DATE", "CATEGORY", "DESCRIPTION", "VENDOR", "AMOUNT"]],
            body: detailData,
            styles: { fontSize: 8, textColor: hexToRgb(PDF_COLORS.text.secondary), lineColor: hexToRgb(PDF_COLORS.border.light), lineWidth: 0.1 },
            headStyles: { fillColor: [255, 255, 255], textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold", lineWidth: 0 },
            alternateRowStyles: { fillColor: "#F9FAFB" },
            columnStyles: { 4: { halign: "right" } }
        })
    }

    drawPageFooter(doc)
    doc.save(`expense_report_${year}.pdf`)
}

// Outstanding Dues Report
export async function generateOutstandingDuesPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    const nextY = await drawModernHeader(doc, "Outstanding Dues", `FY-${year}`, `Generated ${formatDate(new Date())}`)

    // Summary
    drawStatCard(doc, "Total Outstanding", formatCurrency(summary.outstandingDues), 14, nextY + 10, 182, "#F59E0B")

    // Note about data
    const noteY = nextY + 40
    doc.setFontSize(9)
    doc.setTextColor(...hexToRgb(PDF_COLORS.text.tertiary))
    doc.text(
        "Note: Detailed outstanding dues by resident are available in the Residents tab.",
        14,
        noteY
    )

    drawSectionTitle(doc, "Collection Statistics", noteY + 15)

    autoTable(doc, {
        startY: noteY + 23,
        head: [["METRIC", "VALUE"]],
        body: [
            ["Total Revenue Collected", formatCurrency(summary.totalRevenue)],
            ["Outstanding Dues", formatCurrency(summary.outstandingDues)],
            ["Collection Rate", `${summary.collectionRate.toFixed(1)}%`],
            ["Expected Annual Total", formatCurrency(summary.totalRevenue + summary.outstandingDues)],
        ],
        styles: { fontSize: 10, textColor: hexToRgb(PDF_COLORS.text.primary), cellPadding: 5, lineColor: hexToRgb(PDF_COLORS.border.light), lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold", lineWidth: 0 },
        columnStyles: {
            0: { fontStyle: "bold", cellWidth: 80 },
        },
        alternateRowStyles: { fillColor: "#F9FAFB" },
    })

    drawPageFooter(doc)
    doc.save(`outstanding_dues_${year}.pdf`)
}

// Annual Summary Report
export async function generateAnnualSummaryPdf(summary: FinancialSummary, year: number) {
    const { jsPDF, autoTable } = await loadPdfLibs()
    const doc = new jsPDF()

    const nextY = await drawModernHeader(doc, "Annual Financial Summary", `FY-${year}`, `Generated ${formatDate(new Date())}`)

    // Key metrics boxes
    const cardWidth = 44
    const gap = 4
    const startX = 14

    // Custom tiny cards row? No, let's use stat cards but maybe smaller font or 2x2.
    // Actually, let's stick to drawStatCard but modify it to wrap? 
    // Let's do 2 rows of 2 cards.

    drawStatCard(doc, "Total Revenue", formatCurrency(summary.totalRevenue), startX, nextY + 10, 88, "#10B981")
    drawStatCard(doc, "Total Expenses", formatCurrency(summary.totalExpenses), startX + 92, nextY + 10, 88, "#F59E0B")

    drawStatCard(doc, "Net Income", formatCurrency(summary.netIncome), startX, nextY + 40, 88, summary.netIncome >= 0 ? "#10B981" : "#EF4444")
    drawStatCard(doc, "Collection Rate", `${summary.collectionRate.toFixed(1)}%`, startX + 92, nextY + 40, 88, "#3B82F6")

    // Revenue breakdown
    const revenueY = nextY + 75
    drawSectionTitle(doc, "Revenue Breakdown", revenueY)

    autoTable(doc, {
        startY: revenueY + 8,
        head: [["SOURCE", "AMOUNT", "% OF TOTAL"]],
        body: [
            ["Booking Revenue", formatCurrency(summary.bookingRevenue), summary.totalRevenue > 0 ? `${((summary.bookingRevenue / summary.totalRevenue) * 100).toFixed(1)}%` : "0%"],
            ["Maintenance Revenue", formatCurrency(summary.maintenanceRevenue), summary.totalRevenue > 0 ? `${((summary.maintenanceRevenue / summary.totalRevenue) * 100).toFixed(1)}%` : "0%"],
        ],
        styles: { fontSize: 9, textColor: hexToRgb(PDF_COLORS.text.secondary), lineColor: hexToRgb(PDF_COLORS.border.light), lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold", lineWidth: 0 },
        footStyles: { fillColor: "#F3F4F6", textColor: hexToRgb(PDF_COLORS.text.primary), fontStyle: "bold" },
        foot: [["TOTAL REVENUE", formatCurrency(summary.totalRevenue), "100%"]],
        alternateRowStyles: { fillColor: "#F9FAFB" },
    })

    // Monthly trend
    const trendY = (doc as any).lastAutoTable.finalY + 15
    drawSectionTitle(doc, "Monthly Performance", trendY)

    autoTable(doc, {
        startY: trendY + 8,
        head: [["MONTH", "TOTAL INCOME", "EXPENSES", "NET RESULT"]],
        body: summary.monthlyData.map((m) => [
            m.month,
            formatCurrency(m.bookingIncome + m.maintenanceIncome),
            formatCurrency(m.expenses),
            formatCurrency(m.bookingIncome + m.maintenanceIncome - m.expenses),
        ]),
        styles: { fontSize: 9, textColor: hexToRgb(PDF_COLORS.text.secondary), lineColor: hexToRgb(PDF_COLORS.border.light), lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: hexToRgb(PDF_COLORS.text.tertiary), fontStyle: "bold", lineWidth: 0 },
        alternateRowStyles: { fillColor: "#F9FAFB" },
    })

    drawPageFooter(doc)
    doc.save(`annual_summary_${year}.pdf`)
}
