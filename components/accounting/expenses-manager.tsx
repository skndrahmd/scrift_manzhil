"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    RefreshCcw
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Expense, ExpenseCategory } from "@/lib/supabase"

interface ExpensesManagerProps {
    expenses: Expense[]
    categories: ExpenseCategory[]
    loading?: boolean
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    onRefresh: () => void
}

export function ExpensesManager({
    expenses,
    categories,
    loading,
    page,
    totalPages,
    onPageChange,
    onRefresh
}: ExpensesManagerProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [filters, setFilters] = useState({
        categoryId: "all",
        startDate: "",
        endDate: ""
    })

    const { toast } = useToast()

    const [formData, setFormData] = useState({
        category_id: "",
        amount: "",
        description: "",
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: "",
        payment_method: "cash",
        is_recurring: false,
        recurrence_interval: "",
        notes: ""
    })

    const resetForm = () => {
        setFormData({
            category_id: "",
            amount: "",
            description: "",
            expense_date: new Date().toISOString().split('T')[0],
            vendor_name: "",
            payment_method: "cash",
            is_recurring: false,
            recurrence_interval: "",
            notes: ""
        })
    }

    const handleSubmit = async (isEdit: boolean) => {
        if (!formData.amount || !formData.description || !formData.expense_date) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                category_id: formData.category_id || null,
                recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
                ...(isEdit && editingExpense ? { id: editingExpense.id } : {})
            }

            const response = await fetch("/api/accounting/expenses", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to save expense")
            }

            toast({
                title: "Success",
                description: `Expense ${isEdit ? 'updated' : 'added'} successfully`
            })

            resetForm()
            setIsAddOpen(false)
            setIsEditOpen(false)
            setEditingExpense(null)
            onRefresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save expense",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this expense?")) return

        try {
            const response = await fetch(`/api/accounting/expenses?id=${id}`, {
                method: "DELETE"
            })

            if (!response.ok) {
                throw new Error("Failed to delete expense")
            }

            toast({
                title: "Success",
                description: "Expense deleted successfully"
            })
            onRefresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete expense",
                variant: "destructive"
            })
        }
    }

    const openEditDialog = (expense: Expense) => {
        setEditingExpense(expense)
        setFormData({
            category_id: expense.category_id || "",
            amount: expense.amount.toString(),
            description: expense.description,
            expense_date: expense.expense_date,
            vendor_name: expense.vendor_name || "",
            payment_method: expense.payment_method || "cash",
            is_recurring: expense.is_recurring,
            recurrence_interval: expense.recurrence_interval || "",
            notes: expense.notes || ""
        })
        setIsEditOpen(true)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PK', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const getCategoryById = (id: string | null) => {
        return categories.find(c => c.id === id)
    }

    return (
        <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex flex-col gap-4">
                {/* Filters - stack on mobile */}
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
                    <Select
                        value={filters.categoryId}
                        onValueChange={(value) => setFilters({ ...filters, categoryId: value })}
                    >
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-1 sm:flex-none">
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="flex-1 sm:w-[150px]"
                            placeholder="Start"
                        />
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="flex-1 sm:w-[150px]"
                            placeholder="End"
                        />
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={(open) => {
                        setIsAddOpen(open)
                        if (!open) resetForm()
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all w-full sm:w-auto">
                                <Plus className="h-4 w-4" />
                                <span className="sm:inline">Add Expense</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add New Expense</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="add-category">Category</Label>
                                        <Select
                                            value={formData.category_id}
                                            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-amount">Amount (PKR) *</Label>
                                        <Input
                                            id="add-amount"
                                            type="number"
                                            placeholder="5000"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add-description">Description *</Label>
                                    <Input
                                        id="add-description"
                                        placeholder="Enter expense description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="add-expense_date">Date *</Label>
                                        <Input
                                            id="add-expense_date"
                                            type="date"
                                            value={formData.expense_date}
                                            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-vendor_name">Vendor Name</Label>
                                        <Input
                                            id="add-vendor_name"
                                            placeholder="Enter vendor name"
                                            value={formData.vendor_name}
                                            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="add-payment_method">Payment Method</Label>
                                        <Select
                                            value={formData.payment_method}
                                            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                                <SelectItem value="online">Online</SelectItem>
                                                <SelectItem value="cheque">Cheque</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 flex items-end gap-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="add-is_recurring"
                                                checked={formData.is_recurring}
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: !!checked })}
                                            />
                                            <Label htmlFor="add-is_recurring">Recurring</Label>
                                        </div>
                                        {formData.is_recurring && (
                                            <Select
                                                value={formData.recurrence_interval}
                                                onValueChange={(value) => setFormData({ ...formData, recurrence_interval: value })}
                                            >
                                                <SelectTrigger className="w-[130px]">
                                                    <SelectValue placeholder="Interval" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="weekly">Weekly</SelectItem>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                                    <SelectItem value="yearly">Yearly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add-notes">Notes</Label>
                                    <Textarea
                                        id="add-notes"
                                        placeholder="Additional notes..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => handleSubmit(false)} disabled={submitting} className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg transition-all">
                                    {submitting ? "Saving..." : "Add Expense"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Desktop Table View - hidden on mobile */}
            <div className="hidden md:block border border-manzhil-teal/10 rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {[...Array(7)].map((_, j) => (
                                        <TableCell key={j}>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No expenses found. Click "Add Expense" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => {
                                const category = getCategoryById(expense.category_id)
                                return (
                                    <TableRow key={expense.id} className="hover:bg-manzhil-teal/5 transition-colors">
                                        <TableCell className="font-medium">
                                            {formatDate(expense.expense_date)}
                                        </TableCell>
                                        <TableCell>
                                            {category ? (
                                                <Badge
                                                    variant="outline"
                                                    style={{ borderColor: category.color, color: category.color }}
                                                >
                                                    {category.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {expense.description}
                                            {expense.is_recurring && (
                                                <Badge variant="secondary" className="ml-2 text-xs">
                                                    {expense.recurrence_interval}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{expense.vendor_name || '-'}</TableCell>
                                        <TableCell className="capitalize">
                                            {expense.payment_method?.replace('_', ' ') || '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-amber-600">
                                            {formatCurrency(expense.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(expense)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(expense.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg border border-manzhil-teal/10 p-4 shadow-sm animate-pulse space-y-3">
                            <div className="flex justify-between">
                                <div className="h-4 w-24 bg-gray-200 rounded" />
                                <div className="h-4 w-20 bg-gray-200 rounded" />
                            </div>
                            <div className="h-4 w-full bg-gray-200 rounded" />
                            <div className="flex justify-between pt-2">
                                <div className="h-4 w-16 bg-gray-200 rounded" />
                                <div className="h-8 w-20 bg-gray-200 rounded" />
                            </div>
                        </div>
                    ))
                ) : expenses.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-200">
                        <p className="text-muted-foreground">No expenses found</p>
                        <p className="text-sm text-gray-400 mt-1">Tap "Add Expense" to create one</p>
                    </div>
                ) : (
                    expenses.map((expense) => {
                        const category = getCategoryById(expense.category_id)
                        return (
                            <div key={expense.id} className="bg-white rounded-xl border border-manzhil-teal/10 shadow-sm p-4 space-y-3">
                                {/* Header: Date, Category, Amount */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">{formatDate(expense.expense_date)}</p>
                                        {category ? (
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                                style={{ borderColor: category.color, color: category.color }}
                                            >
                                                {category.name}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs">Uncategorized</Badge>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-lg text-amber-600">
                                            {formatCurrency(expense.amount)}
                                        </p>
                                        {expense.is_recurring && (
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                {expense.recurrence_interval}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <p className="text-sm text-gray-800 font-medium">{expense.description}</p>
                                    {expense.vendor_name && (
                                        <p className="text-xs text-gray-500 mt-1">Vendor: {expense.vendor_name}</p>
                                    )}
                                </div>

                                {/* Footer: Payment method and actions */}
                                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 capitalize">
                                        {expense.payment_method?.replace('_', ' ') || 'Unknown'}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(expense)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(expense.id)}
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
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

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open)
                if (!open) {
                    setEditingExpense(null)
                    resetForm()
                }
            }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Expense</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Category</Label>
                                <Select
                                    value={formData.category_id}
                                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-amount">Amount (PKR) *</Label>
                                <Input
                                    id="edit-amount"
                                    type="number"
                                    placeholder="5000"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description *</Label>
                            <Input
                                id="edit-description"
                                placeholder="Enter expense description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-expense_date">Date *</Label>
                                <Input
                                    id="edit-expense_date"
                                    type="date"
                                    value={formData.expense_date}
                                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-vendor_name">Vendor Name</Label>
                                <Input
                                    id="edit-vendor_name"
                                    placeholder="Enter vendor name"
                                    value={formData.vendor_name}
                                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-payment_method">Payment Method</Label>
                                <Select
                                    value={formData.payment_method}
                                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="online">Online</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 flex items-end gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="edit-is_recurring"
                                        checked={formData.is_recurring}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: !!checked })}
                                    />
                                    <Label htmlFor="edit-is_recurring">Recurring</Label>
                                </div>
                                {formData.is_recurring && (
                                    <Select
                                        value={formData.recurrence_interval}
                                        onValueChange={(value) => setFormData({ ...formData, recurrence_interval: value })}
                                    >
                                        <SelectTrigger className="w-[130px]">
                                            <SelectValue placeholder="Interval" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea
                                id="edit-notes"
                                placeholder="Additional notes..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => handleSubmit(true)} disabled={submitting} className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg transition-all">
                            {submitting ? "Saving..." : "Update Expense"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
