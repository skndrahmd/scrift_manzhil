/**
 * @module lib/pdf/csv-export
 * CSV export generators for accounting reports including income statements,
 * collection reports, expense reports, outstanding dues, and annual summaries.
 */

import { FinancialSummary, Expense, ExpenseCategory } from "@/lib/supabase"

// Helper to trigger CSV download
const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }
}

// Helper to escape CSV fields
const escapeCsv = (field: any) => {
    if (field === null || field === undefined) return ''
    const stringField = String(field)
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`
    }
    return stringField
}

// Helper to create CSV string from array of arrays
const createCsvContent = (rows: (string | number | null)[][]) => {
    return rows.map(row => row.map(escapeCsv).join(',')).join('\n')
}

/**
 * Generates and downloads an income statement CSV with monthly breakdowns.
 * @param summary - Financial summary containing monthly income/expense data
 * @param year - Fiscal year for the report file name
 */
export function generateIncomeStatementCsv(summary: FinancialSummary, year: number) {
    const headers = ["Month", "Booking Income", "Maintenance Income", "Total Income", "Expenses", "Net Income"]
    const rows = summary.monthlyData.map(m => [
        m.month,
        m.bookingIncome,
        m.maintenanceIncome,
        m.bookingIncome + m.maintenanceIncome,
        m.expenses,
        (m.bookingIncome + m.maintenanceIncome) - m.expenses
    ])

    // Add totals row
    rows.push([
        "TOTAL",
        summary.bookingRevenue,
        summary.maintenanceRevenue,
        summary.totalRevenue,
        summary.totalExpenses,
        summary.netIncome
    ])

    const content = createCsvContent([headers, ...rows])
    downloadCsv(`income_statement_${year}.csv`, content)
}

/**
 * Generates and downloads a collection report CSV with monthly collection rates.
 * @param summary - Financial summary containing monthly income data
 * @param year - Fiscal year for the report file name
 */
export function generateCollectionReportCsv(summary: FinancialSummary, year: number) {
    const headers = ["Month", "Amount Collected", "Collection Rate"]
    const rows = summary.monthlyData.map(m => {
        const totalIncome = m.bookingIncome + m.maintenanceIncome
        return [
            m.month,
            totalIncome,
            totalIncome > 0 ? "100%" : "0%" // Simplified for now as per PDF
        ]
    })

    const content = createCsvContent([headers, ...rows])
    downloadCsv(`collection_report_${year}.csv`, content)
}

/**
 * Generates and downloads an expense report CSV with category summary and line items.
 * @param expenses - Array of expense records
 * @param categories - Array of expense category definitions
 * @param year - Fiscal year for the report file name
 */
export function generateExpenseReportCsv(expenses: Expense[], categories: ExpenseCategory[], year: number) {
    // Summary by Category
    const categoryTotals: Record<string, { name: string; amount: number }> = {}
    let totalExpenses = 0

    expenses.forEach((expense) => {
        const category = categories.find((c) => c.id === expense.category_id)
        const catId = expense.category_id || "uncategorized"
        const catName = category?.name || "Uncategorized"

        if (!categoryTotals[catId]) {
            categoryTotals[catId] = { name: catName, amount: 0 }
        }
        categoryTotals[catId].amount += expense.amount
        totalExpenses += expense.amount
    })

    const summaryHeaders = ["Category", "Amount", "% of Total"]
    const summaryRows = Object.values(categoryTotals)
        .sort((a, b) => b.amount - a.amount)
        .map(cat => [
            cat.name,
            cat.amount,
            totalExpenses > 0 ? `${((cat.amount / totalExpenses) * 100).toFixed(1)}%` : "0%"
        ])

    summaryRows.push(["TOTAL", totalExpenses, "100%"])

    // Detailed Expenses
    const detailHeaders = ["Date", "Category", "Description", "Vendor", "Payment Method", "Amount"]
    const detailRows = expenses
        .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
        .map(e => {
            const cat = categories.find(c => c.id === e.category_id)
            return [
                e.expense_date,
                cat?.name || "Other",
                e.description,
                e.vendor_name || "-",
                e.payment_method || "-",
                e.amount
            ]
        })

    const content =
        "CATEGORY SUMMARY\n" +
        createCsvContent([summaryHeaders, ...summaryRows]) +
        "\n\nDETAILED EXPENSES\n" +
        createCsvContent([detailHeaders, ...detailRows])

    downloadCsv(`expense_report_${year}.csv`, content)
}

/**
 * Generates and downloads an outstanding dues CSV with key collection metrics.
 * @param summary - Financial summary containing dues and collection data
 * @param year - Fiscal year for the report file name
 */
export function generateOutstandingDuesCsv(summary: FinancialSummary, year: number) {
    const headers = ["Metric", "Value"]
    const rows = [
        ["Total Revenue Collected", summary.totalRevenue],
        ["Outstanding Dues", summary.outstandingDues],
        ["Collection Rate", `${summary.collectionRate.toFixed(1)}%`],
        ["Expected Annual Total", summary.totalRevenue + summary.outstandingDues]
    ]

    const content = createCsvContent([headers, ...rows])
    downloadCsv(`outstanding_dues_${year}.csv`, content)
}

/**
 * Generates and downloads an annual summary CSV with metrics, revenue breakdown, and monthly performance.
 * @param summary - Financial summary for the year
 * @param year - Fiscal year for the report file name
 */
export function generateAnnualSummaryCsv(summary: FinancialSummary, year: number) {
    // Key Metrics
    const metricsHeaders = ["Metric", "Value"]
    const metricsRows = [
        ["Total Revenue", summary.totalRevenue],
        ["Total Expenses", summary.totalExpenses],
        ["Net Income", summary.netIncome],
        ["Collection Rate", `${summary.collectionRate.toFixed(1)}%`]
    ]

    // Revenue Breakdown
    const revenueHeaders = ["Source", "Amount", "% of Total"]
    const revenueRows = [
        ["Booking Revenue", summary.bookingRevenue, summary.totalRevenue > 0 ? `${((summary.bookingRevenue / summary.totalRevenue) * 100).toFixed(1)}%` : "0%"],
        ["Maintenance Revenue", summary.maintenanceRevenue, summary.totalRevenue > 0 ? `${((summary.maintenanceRevenue / summary.totalRevenue) * 100).toFixed(1)}%` : "0%"],
        ["TOTAL REVENUE", summary.totalRevenue, "100%"]
    ]

    // Monthly Performance
    const monthlyHeaders = ["Month", "Total Income", "Expenses", "Net Result"]
    const monthlyRows = summary.monthlyData.map(m => [
        m.month,
        m.bookingIncome + m.maintenanceIncome,
        m.expenses,
        (m.bookingIncome + m.maintenanceIncome) - m.expenses
    ])

    const content =
        "KEY METRICS\n" +
        createCsvContent([metricsHeaders, ...metricsRows]) +
        "\n\nREVENUE BREAKDOWN\n" +
        createCsvContent([revenueHeaders, ...revenueRows]) +
        "\n\nMONTHLY PERFORMANCE\n" +
        createCsvContent([monthlyHeaders, ...monthlyRows])

    downloadCsv(`annual_summary_${year}.csv`, content)
}
