"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Download, BarChart3, Receipt, Wallet, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { FinancialSummaryCards, RevenueBreakdownCards } from "./financial-summary-cards"
import { MonthlyRevenueChart, RevenueBreakdownPieChart } from "./revenue-charts"
import { TransactionsTable, type TransactionFilters } from "./transactions-table"
import { ExpensesManager } from "./expenses-manager"
import {
    generateIncomeStatementPdf,
    generateCollectionReportPdf,
    generateExpenseReportPdf,
    generateOutstandingDuesPdf,
    generateAnnualSummaryPdf,
} from "@/lib/accounting-reports"
import type { FinancialSummary, Transaction, Expense, ExpenseCategory } from "@/lib/supabase"

export function AccountingTab() {
    const [activeSubTab, setActiveSubTab] = useState("dashboard")
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [generatingReport, setGeneratingReport] = useState<string | null>(null)

    // Financial data
    const [summary, setSummary] = useState<FinancialSummary | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [categories, setCategories] = useState<ExpenseCategory[]>([])

    // Filters and pagination
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [transactionsPage, setTransactionsPage] = useState(1)
    const [transactionsTotalPages, setTransactionsTotalPages] = useState(1)
    const [expensesPage, setExpensesPage] = useState(1)
    const [expensesTotalPages, setExpensesTotalPages] = useState(1)
    const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>({
        type: "all",
        startDate: "",
        endDate: "",
        search: ""
    })

    const { toast } = useToast()

    const fetchSummary = useCallback(async () => {
        try {
            const response = await fetch(`/api/accounting/summary?year=${selectedYear}`)
            if (!response.ok) throw new Error("Failed to fetch summary")
            const data = await response.json()
            setSummary(data)
        } catch (error) {
            console.error("Error fetching summary:", error)
        }
    }, [selectedYear])

    const fetchTransactions = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                page: transactionsPage.toString(),
                limit: "20"
            })
            if (transactionFilters.type !== "all") {
                params.set("type", transactionFilters.type)
            }
            if (transactionFilters.startDate) {
                params.set("startDate", transactionFilters.startDate)
            }
            if (transactionFilters.endDate) {
                params.set("endDate", transactionFilters.endDate)
            }

            const response = await fetch(`/api/accounting/transactions?${params}`)
            if (!response.ok) throw new Error("Failed to fetch transactions")
            const data = await response.json()
            setTransactions(data.transactions || [])
            setTransactionsTotalPages(data.totalPages || 1)
        } catch (error) {
            console.error("Error fetching transactions:", error)
        }
    }, [transactionsPage, transactionFilters])

    const fetchExpenses = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                page: expensesPage.toString(),
                limit: "20"
            })

            const response = await fetch(`/api/accounting/expenses?${params}`)
            if (!response.ok) throw new Error("Failed to fetch expenses")
            const data = await response.json()
            setExpenses(data.expenses || [])
            setExpensesTotalPages(data.totalPages || 1)
        } catch (error) {
            console.error("Error fetching expenses:", error)
        }
    }, [expensesPage])

    const fetchAllExpenses = useCallback(async () => {
        try {
            const response = await fetch(`/api/accounting/expenses?limit=1000`)
            if (!response.ok) throw new Error("Failed to fetch all expenses")
            const data = await response.json()
            return data.expenses || []
        } catch (error) {
            console.error("Error fetching all expenses:", error)
            return []
        }
    }, [])

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch("/api/accounting/categories")
            if (!response.ok) throw new Error("Failed to fetch categories")
            const data = await response.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error("Error fetching categories:", error)
        }
    }, [])

    const fetchAllData = useCallback(async () => {
        setLoading(true)
        await Promise.all([
            fetchSummary(),
            fetchTransactions(),
            fetchExpenses(),
            fetchCategories()
        ])
        setLoading(false)
    }, [fetchSummary, fetchTransactions, fetchExpenses, fetchCategories])

    useEffect(() => {
        fetchAllData()
    }, [])

    useEffect(() => {
        fetchSummary()
    }, [selectedYear, fetchSummary])

    useEffect(() => {
        fetchTransactions()
    }, [transactionsPage, transactionFilters, fetchTransactions])

    useEffect(() => {
        fetchExpenses()
    }, [expensesPage, fetchExpenses])

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchAllData()
        setRefreshing(false)
        toast({
            title: "Data Refreshed",
            description: "Financial data has been updated"
        })
    }

    const handleTransactionFilterChange = (filters: TransactionFilters) => {
        setTransactionFilters(filters)
        setTransactionsPage(1)
    }

    // Report generation handlers
    const handleGenerateReport = async (reportType: string) => {
        if (!summary) {
            toast({
                title: "Error",
                description: "Please wait for data to load",
                variant: "destructive"
            })
            return
        }

        setGeneratingReport(reportType)
        try {
            switch (reportType) {
                case "income":
                    await generateIncomeStatementPdf(summary, selectedYear)
                    break
                case "collection":
                    await generateCollectionReportPdf(summary, selectedYear)
                    break
                case "expense":
                    const allExpenses = await fetchAllExpenses()
                    await generateExpenseReportPdf(allExpenses, categories, selectedYear)
                    break
                case "outstanding":
                    await generateOutstandingDuesPdf(summary, selectedYear)
                    break
                case "annual":
                    await generateAnnualSummaryPdf(summary, selectedYear)
                    break
            }
            toast({
                title: "Report Downloaded",
                description: "Your PDF report has been generated"
            })
        } catch (error) {
            console.error("Error generating report:", error)
            toast({
                title: "Error",
                description: "Failed to generate report",
                variant: "destructive"
            })
        } finally {
            setGeneratingReport(null)
        }
    }

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

    const reportCards = [
        {
            id: "income",
            title: "Income Statement",
            description: "Monthly revenue and expense summary",
            icon: BarChart3,
            color: "green"
        },
        {
            id: "collection",
            title: "Collection Report",
            description: "Payment collection analysis",
            icon: Receipt,
            color: "blue"
        },
        {
            id: "expense",
            title: "Expense Report",
            description: "Expense breakdown by category",
            icon: Wallet,
            color: "purple"
        },
        {
            id: "outstanding",
            title: "Outstanding Dues",
            description: "Pending payments aging report",
            icon: FileText,
            color: "orange"
        },
        {
            id: "annual",
            title: "Annual Summary",
            description: "Year-end financial overview",
            icon: Download,
            color: "teal"
        }
    ]



    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-manzhil-dark flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-manzhil-teal" />
                        Accounting
                    </h2>
                    <p className="text-muted-foreground">
                        Track income, expenses, and financial health
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => setSelectedYear(parseInt(value))}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="border-manzhil-teal/30 text-manzhil-dark hover:bg-manzhil-teal/5 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Sub-tabs */}
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="dashboard" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="flex items-center gap-2">
                        <Receipt className="h-6 w-6" />
                        <span className="hidden sm:inline">Transactions</span>
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="hidden sm:inline">Expenses</span>
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">Reports</span>
                    </TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                    <FinancialSummaryCards summary={summary} loading={loading} />
                    <RevenueBreakdownCards summary={summary} loading={loading} />
                    <div className="grid gap-6 lg:grid-cols-2">
                        <MonthlyRevenueChart summary={summary} loading={loading} />
                        <RevenueBreakdownPieChart summary={summary} loading={loading} />
                    </div>
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions">
                    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                        <CardHeader>
                            <CardTitle>Transaction Ledger</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TransactionsTable
                                transactions={transactions}
                                loading={loading}
                                page={transactionsPage}
                                totalPages={transactionsTotalPages}
                                onPageChange={setTransactionsPage}
                                onFilterChange={handleTransactionFilterChange}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses">
                    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                        <CardHeader>
                            <CardTitle>Expense Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ExpensesManager
                                expenses={expenses}
                                categories={categories}
                                loading={loading}
                                page={expensesPage}
                                totalPages={expensesTotalPages}
                                onPageChange={setExpensesPage}
                                onRefresh={() => {
                                    fetchExpenses()
                                    fetchSummary()
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports">
                    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                        <CardHeader>
                            <CardTitle>Financial Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {reportCards.map((report) => {
                                    const Icon = report.icon
                                    const isGenerating = generatingReport === report.id

                                    return (
                                        <Card
                                            key={report.id}
                                            className={`cursor-pointer border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group ${isGenerating ? 'opacity-75' : ''}`}
                                            onClick={() => !isGenerating && handleGenerateReport(report.id)}
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Icon className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                                            </div>
                                            <CardContent className="p-5 relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
                                                        {isGenerating ? (
                                                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                                                        ) : (
                                                            <Icon className="h-6 w-6 text-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{report.title}</h3>
                                                        <p className="text-sm text-white/80">
                                                            {isGenerating ? "Generating PDF..." : report.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>

                            <div className="mt-6 p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground text-center">
                                    Click on any report to generate and download as PDF for {selectedYear}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

