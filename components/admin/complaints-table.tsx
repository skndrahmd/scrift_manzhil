"use client"

import { useState, useMemo, useEffect } from "react"
import { useAdmin } from "@/app/admin/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    AlertTriangle,
    Search,
    Filter,
    CheckCircle,
    Clock,
    Eye,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"

export function ComplaintsTable() {
    const { complaints, fetchComplaints, setLastViewedComplaints } = useAdmin()
    const { toast } = useToast()

    // Local state
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [updatingComplaintId, setUpdatingComplaintId] = useState<string | null>(null)

    const itemsPerPage = 10

    // Mark as viewed when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            setLastViewedComplaints(Date.now())
        }, 2000)
        return () => clearTimeout(timer)
    }, [setLastViewedComplaints])

    // Filter complaints
    const filteredComplaints = useMemo(() => {
        return complaints.filter((complaint) => {
            const matchesSearch =
                !searchTerm ||
                complaint.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                complaint.complaint_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                complaint.subcategory.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesStatus = statusFilter === "all" || complaint.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [complaints, searchTerm, statusFilter])

    const complaintsDisplay = useMemo(
        () => filterByPeriod(filteredComplaints, complaintsPeriod, (c) => c.created_at),
        [filteredComplaints, complaintsPeriod],
    )

    // Pagination
    const paginatedComplaints = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return complaintsDisplay.slice(startIndex, startIndex + itemsPerPage)
    }, [complaintsDisplay, currentPage])

    const totalPages = Math.ceil(complaintsDisplay.length / itemsPerPage)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, statusFilter, complaintsPeriod])

    // Actions
    const updateComplaintStatus = async (complaintId: string, newStatus: string) => {
        setUpdatingComplaintId(complaintId)
        try {
            const response = await fetch("/api/complaints/update-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ complaintId, status: newStatus }),
            })

            if (!response.ok) throw new Error("Failed to update complaint status")

            toast({
                title: "Success",
                description: newStatus === "completed"
                    ? "Complaint marked as completed and resident notified"
                    : "Complaint status updated",
            })
            fetchComplaints()
        } catch (error) {
            toast({ title: "Error", description: "Failed to update complaint status", variant: "destructive" })
        } finally {
            setUpdatingComplaintId(null)
        }
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800"
            case "in-progress":
                return "bg-blue-100 text-blue-800"
            case "pending":
                return "bg-amber-100 text-amber-700"
            case "cancelled":
                return "bg-red-100 text-red-800"
            default:
                return ""
        }
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search complaints..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={complaintsPeriod} onValueChange={(v) => setComplaintsPeriod(v as Period)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="daily">Today</SelectItem>
                        <SelectItem value="weekly">This Week</SelectItem>
                        <SelectItem value="monthly">This Month</SelectItem>
                    </SelectContent>
                </Select>

                <Button
                    onClick={() =>
                        exportToPdf({
                            title: "Complaints Report",
                            periodLabel: periodLabel(complaintsPeriod),
                            columns: [
                                { header: "ID", dataKey: "id" },
                                { header: "Resident", dataKey: "resident" },
                                { header: "Category", dataKey: "category" },
                                { header: "Status", dataKey: "status" },
                                { header: "Date", dataKey: "date" },
                            ],
                            rows: complaintsDisplay.map((c) => ({
                                id: c.complaint_id,
                                resident: c.profiles?.name || "N/A",
                                category: `${c.category} - ${c.subcategory.replace(/_/g, " ")}`,
                                status: c.status,
                                date: formatDateTime(c.created_at),
                            })),
                            fileName: `complaints-${complaintsPeriod}.pdf`,
                        })
                    }
                    variant="outline"
                    className="border-manzhil-teal/30 text-manzhil-dark hover:bg-manzhil-teal/5 transition-colors"
                >
                    <Eye className="h-4 w-4 mr-2" />
                    Export PDF
                </Button>
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block border-0 shadow-lg shadow-manzhil-teal/5 hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                <TableHead>Complaint ID</TableHead>
                                <TableHead>Resident</TableHead>
                                <TableHead>Apartment</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedComplaints.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12">
                                        <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No complaints found</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedComplaints.map((complaint) => (
                                    <TableRow key={complaint.id} className="hover:bg-manzhil-teal/5 transition-colors">
                                        <TableCell className="font-mono text-sm">{complaint.complaint_id}</TableCell>
                                        <TableCell className="font-medium">{complaint.profiles?.name || "N/A"}</TableCell>
                                        <TableCell className="text-gray-600">{complaint.profiles?.apartment_number}</TableCell>
                                        <TableCell className="text-gray-600">
                                            <span className="capitalize">{complaint.category}</span>
                                            <span className="text-gray-400 mx-1">•</span>
                                            <span className="capitalize">{complaint.subcategory.replace(/_/g, " ")}</span>
                                        </TableCell>
                                        <TableCell className="text-gray-600 max-w-[200px] truncate">
                                            {complaint.description || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusBadgeClass(complaint.status)}>
                                                {complaint.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                                {complaint.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                                {complaint.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-600 text-sm">{formatDateTime(complaint.created_at)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Select
                                                    value={complaint.status}
                                                    onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
                                                    disabled={updatingComplaintId === complaint.id}
                                                >
                                                    <SelectTrigger className="w-[130px] h-8">
                                                        {updatingComplaintId === complaint.id ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                        ) : (
                                                            <SelectValue />
                                                        )}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {paginatedComplaints.length === 0 ? (
                    <Card className="border-manzhil-teal/10">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">No complaints found</p>
                        </CardContent>
                    </Card>
                ) : (
                    paginatedComplaints.map((complaint) => (
                        <Card key={complaint.id} className="border-manzhil-teal/10 shadow-sm">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-manzhil-dark text-sm font-mono">{complaint.complaint_id}</h3>
                                        <p className="text-xs text-muted-foreground">{formatDateTime(complaint.created_at)}</p>
                                    </div>
                                    <Badge className={`${getStatusBadgeClass(complaint.status)} text-xs`}>
                                        {complaint.status}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500 block text-xs">Resident</span>
                                        <span className="font-medium text-gray-700">{complaint.profiles?.name || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs">Apartment</span>
                                        <span className="font-medium text-gray-700">{complaint.profiles?.apartment_number}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-500 block text-xs">Category</span>
                                        <div className="flex items-center text-gray-700">
                                            <span className="capitalize">{complaint.category}</span>
                                            <span className="text-gray-400 mx-2">•</span>
                                            <span className="capitalize">{complaint.subcategory.replace(/_/g, " ")}</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-500 block text-xs">Description</span>
                                        <p className="text-gray-700 mt-1 line-clamp-2 text-sm">{complaint.description || "-"}</p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100">
                                    <span className="text-gray-500 block text-xs mb-2">Update Status</span>
                                    <Select
                                        value={complaint.status}
                                        onValueChange={(value) => updateComplaintStatus(complaint.id, value)}
                                        disabled={updatingComplaintId === complaint.id}
                                    >
                                        <SelectTrigger className="w-full h-9">
                                            {updatingComplaintId === complaint.id ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto" />
                                            ) : (
                                                <SelectValue />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => (
                            <PaginationItem key={i}>
                                <PaginationLink
                                    onClick={() => setCurrentPage(i + 1)}
                                    isActive={currentPage === i + 1}
                                    className="cursor-pointer"
                                >
                                    {i + 1}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    )
}

export default ComplaintsTable
