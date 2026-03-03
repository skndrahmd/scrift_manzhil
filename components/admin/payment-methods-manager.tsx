"use client"

import { useState, useEffect } from "react"
import type { PaymentMethod, PaymentMethodType } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    CreditCard,
    Plus,
    Edit,
    Trash2,
    Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const METHOD_LABELS: Record<PaymentMethodType, { label: string; emoji: string }> = {
    jazzcash: { label: "JazzCash", emoji: "\u{1F4F1}" },
    easypaisa: { label: "EasyPaisa", emoji: "\u{1F49A}" },
    bank_transfer: { label: "Bank Transfer", emoji: "\u{1F3E6}" },
}

const defaultFormData = {
    type: "jazzcash" as PaymentMethodType,
    account_title: "",
    account_number: "",
    bank_name: "",
    is_enabled: true,
    sort_order: 0,
}

export function PaymentMethodsManager() {
    const [methods, setMethods] = useState<PaymentMethod[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
    const [formData, setFormData] = useState(defaultFormData)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const { toast } = useToast()

    const fetchMethods = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/admin/payment-methods")
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setMethods(data.methods || [])
        } catch (error: any) {
            console.error("Error fetching payment methods:", error)
            toast({ title: "Error", description: "Failed to fetch payment methods", variant: "destructive" })
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchMethods()
    }, [])

    const resetForm = () => {
        setFormData(defaultFormData)
        setEditingMethod(null)
    }

    const openCreateDialog = () => {
        resetForm()
        setDialogOpen(true)
    }

    const openEditDialog = (method: PaymentMethod) => {
        setEditingMethod(method)
        setFormData({
            type: method.type,
            account_title: method.account_title,
            account_number: method.account_number,
            bank_name: method.bank_name || "",
            is_enabled: method.is_enabled,
            sort_order: method.sort_order,
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.account_title || !formData.account_number) {
            toast({ title: "Error", description: "Account title and number are required", variant: "destructive" })
            return
        }

        setSaving(true)
        try {
            const url = "/api/admin/payment-methods"
            const method = editingMethod ? "PUT" : "POST"
            const body = editingMethod
                ? { id: editingMethod.id, ...formData }
                : formData

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast({
                title: "Success",
                description: editingMethod ? "Payment method updated" : "Payment method created",
            })
            setDialogOpen(false)
            resetForm()
            fetchMethods()
        } catch (error: any) {
            console.error("Save error:", error)
            toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" })
        }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        try {
            const res = await fetch(`/api/admin/payment-methods?id=${id}`, { method: "DELETE" })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast({ title: "Success", description: "Payment method deleted" })
            fetchMethods()
        } catch (error: any) {
            console.error("Delete error:", error)
            toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" })
        } finally {
            setDeletingId(null)
        }
    }

    const toggleEnabled = async (method: PaymentMethod) => {
        setTogglingId(method.id)
        try {
            const res = await fetch("/api/admin/payment-methods", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: method.id, is_enabled: !method.is_enabled }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast({
                title: "Success",
                description: `${METHOD_LABELS[method.type].label} ${method.is_enabled ? "disabled" : "enabled"}`,
            })
            fetchMethods()
        } catch (error: any) {
            console.error("Toggle error:", error)
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
        } finally {
            setTogglingId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-medium text-manzhil-dark flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-manzhil-teal" />
                        Payment Methods
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Configure payment accounts for residents</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open)
                    if (!open) resetForm()
                }}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={openCreateDialog}
                            className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Payment Method
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                                <CreditCard className="h-5 w-5 text-manzhil-teal" />
                                {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingMethod
                                    ? "Update payment method details"
                                    : "Add a new payment account for residents"}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) => setFormData(f => ({ ...f, type: val as PaymentMethodType }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(METHOD_LABELS).map(([key, { label, emoji }]) => (
                                            <SelectItem key={key} value={key}>
                                                {emoji} {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_title">Account Title</Label>
                                <Input
                                    id="account_title"
                                    value={formData.account_title}
                                    onChange={(e) => setFormData(f => ({ ...f, account_title: e.target.value }))}
                                    placeholder="Muhammad Ahmed"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_number">Account Number</Label>
                                <Input
                                    id="account_number"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData(f => ({ ...f, account_number: e.target.value }))}
                                    placeholder="03001234567"
                                />
                            </div>

                            {formData.type === "bank_transfer" && (
                                <div className="space-y-2">
                                    <Label htmlFor="bank_name">Bank Name</Label>
                                    <Input
                                        id="bank_name"
                                        value={formData.bank_name}
                                        onChange={(e) => setFormData(f => ({ ...f, bank_name: e.target.value }))}
                                        placeholder="HBL, MCB, UBL, etc."
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Sort Order</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData(f => ({ ...f, sort_order: Number(e.target.value) }))}
                                    className="max-w-[120px]"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Enabled</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Show this method to residents
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.is_enabled}
                                    onCheckedChange={(checked) => setFormData(f => ({ ...f, is_enabled: checked }))}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving || !formData.account_title || !formData.account_number}
                                className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingMethod ? "Update" : "Create"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Methods List */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-manzhil-teal" />
                        </div>
                    ) : methods.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No payment methods configured yet</p>
                            <p className="text-sm">Add your first payment method to get started</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50">
                                            <TableHead>Type</TableHead>
                                            <TableHead>Account Title</TableHead>
                                            <TableHead>Account Number</TableHead>
                                            <TableHead>Bank Name</TableHead>
                                            <TableHead>Enabled</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {methods.map((method) => (
                                            <TableRow key={method.id}>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {METHOD_LABELS[method.type].emoji} {METHOD_LABELS[method.type].label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">{method.account_title}</TableCell>
                                                <TableCell className="font-mono text-sm">{method.account_number}</TableCell>
                                                <TableCell>{method.bank_name || "—"}</TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={method.is_enabled}
                                                        disabled={togglingId === method.id}
                                                        onCheckedChange={() => toggleEnabled(method)}
                                                    />
                                                    {togglingId === method.id && (
                                                        <Loader2 className="h-4 w-4 animate-spin inline ml-2 text-manzhil-teal" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditDialog(method)}
                                                            className="h-8 w-8"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={deletingId === method.id}
                                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                >
                                                                    {deletingId === method.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to delete this {METHOD_LABELS[method.type].label} account ({method.account_title})? This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleDelete(method.id)}
                                                                        disabled={deletingId === method.id}
                                                                        className="bg-red-500 hover:bg-red-600"
                                                                    >
                                                                        {deletingId === method.id ? (
                                                                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
                                                                        ) : (
                                                                            "Delete"
                                                                        )}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile card view */}
                            <div className="md:hidden p-4 space-y-4">
                                {methods.map((method) => (
                                    <Card key={method.id} className="border-manzhil-teal/10 shadow-sm">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <Badge variant="secondary" className="mb-2">
                                                        {METHOD_LABELS[method.type].emoji} {METHOD_LABELS[method.type].label}
                                                    </Badge>
                                                    <p className="font-medium text-manzhil-dark">{method.account_title}</p>
                                                    <p className="text-sm font-mono text-gray-500">{method.account_number}</p>
                                                    {method.bank_name && (
                                                        <p className="text-xs text-gray-400">{method.bank_name}</p>
                                                    )}
                                                </div>
                                                <Switch
                                                    checked={method.is_enabled}
                                                    onCheckedChange={() => toggleEnabled(method)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-100">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(method)}
                                                    className="h-8 w-8"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete this {METHOD_LABELS[method.type].label} account ({method.account_title})? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(method.id)}
                                                                className="bg-red-500 hover:bg-red-600"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default PaymentMethodsManager
