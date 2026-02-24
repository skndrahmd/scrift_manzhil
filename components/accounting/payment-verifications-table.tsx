"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Search,
    Check,
    X,
    Loader2,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Eye,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Verification {
    id: string
    payment_type: "maintenance" | "booking"
    maintenance_payment_id: string | null
    booking_id: string | null
    unit_id: string
    resident_id: string
    payment_method_id: string | null
    amount: number
    receipt_image_url: string
    status: "pending" | "approved" | "rejected"
    rejection_reason: string | null
    reviewed_by: string | null
    reviewed_at: string | null
    created_at: string
    profiles: {
        id: string
        name: string
        phone_number: string
        apartment_number: string
    } | null
    units: {
        id: string
        apartment_number: string
    } | null
    reviewer: {
        name: string
    } | null
}

interface Props {
    onPendingCountChange?: (count: number) => void
}

export function PaymentVerificationsTable({ onPendingCountChange }: Props) {
    const [verifications, setVerifications] = useState<Verification[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("all")
    const [typeFilter, setTypeFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)

    // Action states
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [rejectingVerification, setRejectingVerification] = useState<Verification | null>(null)
    const [rejectionReason, setRejectionReason] = useState("")
    const [viewingVerification, setViewingVerification] = useState<Verification | null>(null)

    const { toast } = useToast()

    const fetchVerifications = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                status: statusFilter,
                type: typeFilter,
            })
            if (searchQuery) {
                params.set("search", searchQuery)
            }

            const res = await fetch(`/api/payment-verifications?${params}`)
            if (!res.ok) throw new Error("Failed to fetch")
            const data = await res.json()

            setVerifications(data.verifications || [])
            setTotalPages(data.totalPages || 1)
            setTotalCount(data.totalCount || 0)
            onPendingCountChange?.(data.pendingCount || 0)
        } catch (err) {
            console.error("Error fetching verifications:", err)
        } finally {
            setLoading(false)
        }
    }, [page, statusFilter, typeFilter, searchQuery, onPendingCountChange])

    useEffect(() => {
        fetchVerifications()
    }, [fetchVerifications])

    // Reset page on filter change
    useEffect(() => {
        setPage(1)
    }, [statusFilter, typeFilter, searchQuery])

    const handleApprove = async (id: string) => {
        setUpdatingId(id)
        try {
            const res = await fetch(`/api/payment-verifications/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "approved" }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to approve")

            toast({
                title: "Payment Approved",
                description: "The payment has been verified and marked as paid.",
            })
            fetchVerifications()
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to approve",
                variant: "destructive",
            })
        } finally {
            setUpdatingId(null)
        }
    }

    const handleReject = async () => {
        if (!rejectingVerification || !rejectionReason.trim()) return

        setUpdatingId(rejectingVerification.id)
        try {
            const res = await fetch(`/api/payment-verifications/${rejectingVerification.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "rejected",
                    rejection_reason: rejectionReason.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to reject")

            toast({
                title: "Payment Rejected",
                description: "The resident has been notified.",
            })
            setRejectingVerification(null)
            setRejectionReason("")
            fetchVerifications()
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to reject",
                variant: "destructive",
            })
        } finally {
            setUpdatingId(null)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
            case "approved":
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>
            case "rejected":
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const typeBadge = (type: string) => {
        return type === "maintenance" ? (
            <Badge variant="outline" className="border-blue-200 text-blue-700">Maintenance</Badge>
        ) : (
            <Badge variant="outline" className="border-purple-200 text-purple-700">Booking</Badge>
        )
    }

    // Mobile card view
    const VerificationCard = ({ v }: { v: Verification }) => (
        <Card className="border border-manzhil-teal/10">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-medium text-sm">{v.profiles?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                            Unit {v.units?.apartment_number || "N/A"}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {statusBadge(v.status)}
                        {typeBadge(v.payment_type)}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {v.receipt_image_url && (
                        <button
                            onClick={() => setViewingVerification(v)}
                            className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 hover:opacity-80 transition-opacity"
                        >
                            <img
                                src={v.receipt_image_url}
                                alt="Receipt"
                                className="w-full h-full object-cover"
                            />
                        </button>
                    )}
                    <div className="flex-1">
                        <p className="text-sm font-medium">PKR {Number(v.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(v.created_at)}</p>
                    </div>
                </div>

                {v.status === "rejected" && v.rejection_reason && (
                    <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        Reason: {v.rejection_reason}
                    </p>
                )}

                {v.status === "pending" && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={updatingId === v.id}
                            onClick={() => handleApprove(v.id)}
                        >
                            {updatingId === v.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4 mr-1" />
                            )}
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            disabled={updatingId === v.id}
                            onClick={() => {
                                setRejectingVerification(v)
                                setRejectionReason("")
                            }}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or apartment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="booking">Booking</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-manzhil-teal" />
                </div>
            ) : verifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No payment verifications found</p>
                    <p className="text-sm mt-1">
                        {statusFilter !== "all" || typeFilter !== "all" || searchQuery
                            ? "Try adjusting your filters"
                            : "Verifications will appear here when residents submit payment receipts"}
                    </p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-lg border border-manzhil-teal/10 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-manzhil-teal/5">
                                    <TableHead>Resident</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Receipt</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {verifications.map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="font-medium">
                                            {v.profiles?.name || "Unknown"}
                                        </TableCell>
                                        <TableCell>
                                            {v.units?.apartment_number || "N/A"}
                                        </TableCell>
                                        <TableCell>{typeBadge(v.payment_type)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            PKR {Number(v.amount).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {v.receipt_image_url ? (
                                                <button
                                                    onClick={() => setViewingVerification(v)}
                                                    className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
                                                >
                                                    <img
                                                        src={v.receipt_image_url}
                                                        alt="Receipt"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </button>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">No image</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(v.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {statusBadge(v.status)}
                                                {v.status === "rejected" && v.rejection_reason && (
                                                    <p className="text-xs text-red-600 max-w-[150px] truncate" title={v.rejection_reason}>
                                                        {v.rejection_reason}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => setViewingVerification(v)}
                                                    title="View details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {v.status === "pending" && (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                                                            disabled={updatingId === v.id}
                                                            onClick={() => handleApprove(v.id)}
                                                            title="Approve"
                                                        >
                                                            {updatingId === v.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Check className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            className="h-8 w-8"
                                                            disabled={updatingId === v.id}
                                                            onClick={() => {
                                                                setRejectingVerification(v)
                                                                setRejectionReason("")
                                                            }}
                                                            title="Reject"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {verifications.map((v) => (
                            <VerificationCard key={v.id} v={v} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-muted-foreground">
                                Page {page} of {totalPages} ({totalCount} total)
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* View Receipt Modal */}
            <Dialog open={!!viewingVerification} onOpenChange={(open) => !open && setViewingVerification(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-manzhil-teal" />
                            Payment Verification Details
                        </DialogTitle>
                    </DialogHeader>
                    {viewingVerification && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Resident</p>
                                    <p className="font-medium">{viewingVerification.profiles?.name || "Unknown"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Unit</p>
                                    <p className="font-medium">{viewingVerification.units?.apartment_number || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p>{typeBadge(viewingVerification.payment_type)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Amount</p>
                                    <p className="font-medium">PKR {Number(viewingVerification.amount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Submitted</p>
                                    <p>{formatDate(viewingVerification.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <p>{statusBadge(viewingVerification.status)}</p>
                                </div>
                                {viewingVerification.reviewed_at && (
                                    <>
                                        <div>
                                            <p className="text-muted-foreground">Reviewed</p>
                                            <p>{formatDate(viewingVerification.reviewed_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Reviewed By</p>
                                            <p>{viewingVerification.reviewer?.name || "Admin"}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {viewingVerification.rejection_reason && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                    <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                                    <p className="text-sm text-red-700 mt-1">{viewingVerification.rejection_reason}</p>
                                </div>
                            )}

                            {viewingVerification.receipt_image_url && (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Receipt Image</p>
                                    <div className="rounded-lg overflow-hidden border border-gray-200">
                                        <img
                                            src={viewingVerification.receipt_image_url}
                                            alt="Payment Receipt"
                                            className="w-full max-h-[400px] object-contain bg-gray-50"
                                        />
                                    </div>
                                    <a
                                        href={viewingVerification.receipt_image_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-manzhil-teal hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Open full image
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {viewingVerification?.status === "pending" && (
                            <div className="flex gap-2 w-full">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    disabled={updatingId === viewingVerification.id}
                                    onClick={() => {
                                        handleApprove(viewingVerification.id)
                                        setViewingVerification(null)
                                    }}
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={updatingId === viewingVerification.id}
                                    onClick={() => {
                                        setRejectingVerification(viewingVerification)
                                        setRejectionReason("")
                                        setViewingVerification(null)
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Reason Dialog */}
            <Dialog open={!!rejectingVerification} onOpenChange={(open) => !open && setRejectingVerification(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject Payment Receipt</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting this receipt. The resident will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    {rejectingVerification && (
                        <div className="space-y-4">
                            <div className="text-sm space-y-1">
                                <p><strong>Resident:</strong> {rejectingVerification.profiles?.name}</p>
                                <p><strong>Amount:</strong> PKR {Number(rejectingVerification.amount).toLocaleString()}</p>
                                <p><strong>Type:</strong> {rejectingVerification.payment_type === "maintenance" ? "Maintenance" : "Booking"}</p>
                            </div>
                            <div>
                                <Textarea
                                    placeholder="Enter rejection reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRejectingVerification(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={!rejectionReason.trim() || updatingId === rejectingVerification?.id}
                            onClick={handleReject}
                        >
                            {updatingId === rejectingVerification?.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <X className="h-4 w-4 mr-2" />
                            )}
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
