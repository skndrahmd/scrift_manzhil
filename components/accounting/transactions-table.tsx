"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight
} from "lucide-react"
import type { Transaction } from "@/lib/supabase"

interface TransactionsTableProps {
    transactions: Transaction[]
    loading?: boolean
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    onFilterChange: (filters: TransactionFilters) => void
}

export interface TransactionFilters {
    type: string
    startDate: string
    endDate: string
    search: string
}

export function TransactionsTable({
    transactions,
    loading,
    page,
    totalPages,
    onPageChange,
    onFilterChange
}: TransactionsTableProps) {
    const [filters, setFilters] = useState<TransactionFilters>({
        type: "all",
        startDate: "",
        endDate: "",
        search: ""
    })

    const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const formatCurrency = (amount: number) => {
        const absAmount = Math.abs(amount)
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(absAmount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PK', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            booking_income: "Booking",
            maintenance_income: "Maintenance",
            expense: "Expense",
            refund: "Refund",
            other_income: "Other"
        }
        return labels[type] || type
    }

    const getTypeBadgeVariant = (type: string) => {
        if (type.includes('income')) return 'default'
        if (type === 'expense') return 'destructive'
        if (type === 'refund') return 'secondary'
        return 'outline'
    }

    const getPaymentMethodLabel = (method: string | null) => {
        if (!method) return '-'
        const labels: Record<string, string> = {
            cash: "Cash",
            bank_transfer: "Bank Transfer",
            online: "Online",
            cheque: "Cheque",
            other: "Other"
        }
        return labels[method] || method
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by description or resident..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange("type", value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="booking_income">Booking Income</SelectItem>
                        <SelectItem value="maintenance_income">Maintenance Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="other_income">Other Income</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    type="date"
                    placeholder="Start Date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="w-[150px]"
                />

                <Input
                    type="date"
                    placeholder="End Date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="w-[150px]"
                />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block border border-manzhil-teal/10 rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Resident</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(6)].map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No transactions found
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((transaction) => (
                                <TableRow key={transaction.id} className="hover:bg-manzhil-teal/5 transition-colors">
                                    <TableCell className="font-medium">
                                        {formatDate(transaction.transaction_date)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getTypeBadgeVariant(transaction.transaction_type)}>
                                            {getTypeLabel(transaction.transaction_type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {transaction.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.profiles ? (
                                            <div>
                                                <div className="font-medium">{transaction.profiles.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {transaction.profiles.apartment_number}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {getPaymentMethodLabel(transaction.payment_method)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className={`flex items-center justify-end font-medium ${transaction.amount >= 0 ? 'text-manzhil-teal' : 'text-amber-600'
                                            }`}>
                                            {transaction.amount >= 0 ? (
                                                <ArrowUpRight className="h-4 w-4 mr-1" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4 mr-1" />
                                            )}
                                            {formatCurrency(transaction.amount)}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg border border-manzhil-teal/10 p-4 shadow-sm animate-pulse space-y-3">
                            <div className="flex justify-between">
                                <div className="h-4 w-24 bg-gray-200 rounded" />
                                <div className="h-4 w-16 bg-gray-200 rounded" />
                            </div>
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="flex justify-between pt-2">
                                <div className="h-4 w-20 bg-gray-200 rounded" />
                                <div className="h-4 w-24 bg-gray-200 rounded" />
                            </div>
                        </div>
                    ))
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-200">
                        <p className="text-muted-foreground">No transactions found</p>
                    </div>
                ) : (
                    transactions.map((transaction) => (
                        <div key={transaction.id} className="bg-white rounded-xl border border-manzhil-teal/10 shadow-sm p-4 space-y-3 overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">{formatDate(transaction.transaction_date)}</p>
                                    <Badge variant={getTypeBadgeVariant(transaction.transaction_type)} className="text-xs">
                                        {getTypeLabel(transaction.transaction_type)}
                                    </Badge>
                                </div>
                                <div className={`flex items-center font-medium text-lg ${transaction.amount >= 0 ? 'text-manzhil-teal' : 'text-amber-600'}`}>
                                    {transaction.amount >= 0 ? "+" : ""}
                                    {formatCurrency(transaction.amount)}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-gray-800 font-medium">{transaction.description || '-'}</p>
                                {transaction.profiles && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {transaction.profiles.name} • {transaction.profiles.apartment_number}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-xs text-gray-500">
                                <span>{getPaymentMethodLabel(transaction.payment_method)}</span>
                                {transaction.amount < 0 ? (
                                    <span className="flex items-center text-amber-600">
                                        <ArrowDownRight className="h-3 w-3 mr-1" /> Expense
                                    </span>
                                ) : (
                                    <span className="flex items-center text-manzhil-teal">
                                        <ArrowUpRight className="h-3 w-3 mr-1" /> Income
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
