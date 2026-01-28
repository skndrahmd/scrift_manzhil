"use client"

import { useState } from "react"
import { useAdmin } from "@/app/admin/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    Bell,
    Eye,
    Ticket,
    X,
    Loader2,
    ImageIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { VisitorPass } from "@/lib/supabase"

export function VisitorsTable() {
    const { visitors, fetchVisitors, loading } = useAdmin()
    const { toast } = useToast()

    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [dateFilter, setDateFilter] = useState<string>("all")
    const [selectedVisitor, setSelectedVisitor] = useState<VisitorPass | null>(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false)
    const [isNotifying, setIsNotifying] = useState(false)
    const [isImageModalOpen, setIsImageModalOpen] = useState(false)
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

    // Format date for display
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-PK", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })
    }

    // Get status badge styling
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
            case "arrived":
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Arrived</Badge>
            case "cancelled":
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    // Filter visitors
    const today = new Date().toISOString().split('T')[0]
    const filteredVisitors = visitors.filter(visitor => {
        // Search filter - handle null values
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
            (visitor.visitor_name?.toLowerCase().includes(searchLower) ?? false) ||
            (visitor.visitor_cnic?.includes(searchQuery) ?? false) ||
            (visitor.visitor_phone?.includes(searchQuery) ?? false) ||
            (visitor.profiles?.name?.toLowerCase().includes(searchLower) ?? false) ||
            (visitor.profiles?.apartment_number?.toLowerCase().includes(searchLower) ?? false)

        // Status filter
        const matchesStatus = statusFilter === "all" || visitor.status === statusFilter

        // Date filter
        let matchesDate = true
        if (dateFilter === "today") {
            matchesDate = visitor.visit_date === today
        } else if (dateFilter === "upcoming") {
            matchesDate = visitor.visit_date > today
        } else if (dateFilter === "past") {
            matchesDate = visitor.visit_date < today
        }

        return matchesSearch && matchesStatus && matchesDate
    })

    // Open view modal
    const openViewModal = (visitor: VisitorPass) => {
        setSelectedVisitor(visitor)
        setIsViewModalOpen(true)
    }

    // Open notify modal
    const openNotifyModal = (visitor: VisitorPass) => {
        setSelectedVisitor(visitor)
        setIsNotifyModalOpen(true)
    }

    // Open image modal
    const openImageModal = (imageUrl: string) => {
        setSelectedImageUrl(imageUrl)
        setIsImageModalOpen(true)
    }

    // Handle notify arrival
    const handleNotifyArrival = async () => {
        if (!selectedVisitor) return

        setIsNotifying(true)
        try {
            const response = await fetch("/api/visitors/notify-arrival", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitorPassId: selectedVisitor.id }),
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Notification Sent",
                    description: `${selectedVisitor.profiles?.name || "Resident"} has been notified of their visitor's arrival.`,
                })
                setIsNotifyModalOpen(false)
                fetchVisitors()
            } else {
                throw new Error(data.error || "Failed to send notification")
            }
        } catch (error) {
            console.error("Error notifying arrival:", error)
            toast({
                title: "Error",
                description: "Failed to send arrival notification. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsNotifying(false)
        }
    }

    // Clear filters
    const clearFilters = () => {
        setSearchQuery("")
        setStatusFilter("all")
        setDateFilter("all")
    }

    const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFilter !== "all"

    return (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
            <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-manzhil-dark">
                        <Ticket className="h-5 w-5 text-manzhil-teal" />
                        Visitor Passes
                    </CardTitle>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search visitors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-[200px] border-manzhil-teal/20 focus:border-manzhil-teal"
                            />
                        </div>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[130px] border-manzhil-teal/20">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="arrived">Arrived</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date Filter */}
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[130px] border-manzhil-teal/20">
                                <SelectValue placeholder="Date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dates</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="upcoming">Upcoming</SelectItem>
                                <SelectItem value="past">Past</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-manzhil-teal hover:text-manzhil-dark"
                            >
                                <X className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-manzhil-teal" />
                    </div>
                ) : filteredVisitors.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No visitor passes found</p>
                        {hasActiveFilters && (
                            <Button
                                variant="link"
                                onClick={clearFilters}
                                className="mt-2 text-manzhil-teal"
                            >
                                Clear filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-lg border border-manzhil-teal/10 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-manzhil-teal/5 hover:bg-manzhil-teal/5">
                                    <TableHead>CNIC Image</TableHead>
                                    <TableHead>Visit Date</TableHead>
                                    <TableHead>Resident</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVisitors.map((visitor) => (
                                    <TableRow key={visitor.id} className="hover:bg-manzhil-teal/5">
                                        <TableCell>
                                            {visitor.cnic_image_url ? (
                                                <button
                                                    onClick={() => openImageModal(visitor.cnic_image_url!)}
                                                    className="relative group"
                                                >
                                                    <img
                                                        src={visitor.cnic_image_url}
                                                        alt="CNIC"
                                                        className="w-16 h-10 object-cover rounded border border-gray-200 group-hover:border-manzhil-teal transition-colors"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center transition-opacity">
                                                        <Eye className="h-4 w-4 text-white" />
                                                    </div>
                                                </button>
                                            ) : visitor.visitor_cnic ? (
                                                <span className="text-gray-600 font-mono text-sm">{visitor.visitor_cnic}</span>
                                            ) : (
                                                <span className="text-gray-400 flex items-center gap-1">
                                                    <ImageIcon className="h-4 w-4" />
                                                    No image
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-600">{formatDate(visitor.visit_date)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-manzhil-dark">{visitor.profiles?.name || "Unknown"}</span>
                                                <span className="text-xs text-gray-500">{visitor.profiles?.apartment_number}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(visitor.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                {/* View Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openViewModal(visitor)}
                                                    className="h-8 w-8 p-0 border-manzhil-teal/30 hover:bg-manzhil-teal/10"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4 text-manzhil-teal" />
                                                </Button>

                                                {/* Notify Arrival Button - only for pending visitors */}
                                                {visitor.status === "pending" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openNotifyModal(visitor)}
                                                        className="h-8 px-3 border-manzhil-teal/30 hover:bg-manzhil-teal/10 text-manzhil-teal hover:text-manzhil-dark"
                                                        title="Mark as Arrived & Notify"
                                                    >
                                                        <Bell className="h-4 w-4 mr-1" />
                                                        Notify
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* View Details Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                            <Ticket className="h-5 w-5 text-manzhil-teal" />
                            Visitor Pass Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedVisitor && (
                        <div className="space-y-6 py-4">
                            {/* CNIC Image */}
                            {selectedVisitor.cnic_image_url && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">CNIC Image</h4>
                                    <button
                                        onClick={() => openImageModal(selectedVisitor.cnic_image_url!)}
                                        className="relative group w-full"
                                    >
                                        <img
                                            src={selectedVisitor.cnic_image_url}
                                            alt="CNIC"
                                            className="w-full max-h-48 object-contain rounded-lg border border-gray-200 group-hover:border-manzhil-teal transition-colors"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                            <span className="text-white text-sm font-medium">Click to enlarge</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Visit Info */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Visit Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Visit Date</p>
                                        <p className="font-medium text-manzhil-dark">{formatDate(selectedVisitor.visit_date)}</p>
                                    </div>
                                    {selectedVisitor.visitor_name && (
                                        <div>
                                            <p className="text-xs text-gray-500">Visitor Name</p>
                                            <p className="font-medium">{selectedVisitor.visitor_name}</p>
                                        </div>
                                    )}
                                    {selectedVisitor.visitor_cnic && (
                                        <div>
                                            <p className="text-xs text-gray-500">CNIC</p>
                                            <p className="font-mono text-sm">{selectedVisitor.visitor_cnic}</p>
                                        </div>
                                    )}
                                    {selectedVisitor.visitor_phone && (
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <p className="text-manzhil-dark">{selectedVisitor.visitor_phone}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Resident Info */}
                            <div className="space-y-3 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Registered By</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Resident Name</p>
                                        <p className="font-medium text-manzhil-dark">{selectedVisitor.profiles?.name || "Unknown"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Apartment</p>
                                        <p className="text-manzhil-dark">{selectedVisitor.profiles?.apartment_number || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Phone</p>
                                        <p className="text-manzhil-dark">{selectedVisitor.profiles?.phone_number || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-3 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</h4>
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(selectedVisitor.status)}
                                    {selectedVisitor.notified_at && (
                                        <span className="text-xs text-gray-500">
                                            Notified: {new Date(selectedVisitor.notified_at).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Image Fullscreen Modal */}
            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-2">
                    <DialogHeader className="sr-only">
                        <DialogTitle>CNIC Image</DialogTitle>
                    </DialogHeader>
                    {selectedImageUrl && (
                        <img
                            src={selectedImageUrl}
                            alt="CNIC Full Size"
                            className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Notify Arrival Modal */}
            <Dialog open={isNotifyModalOpen} onOpenChange={setIsNotifyModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                            <Bell className="h-5 w-5 text-manzhil-teal" />
                            Notify Visitor Arrival
                        </DialogTitle>
                        <DialogDescription>
                            This will mark the visitor as arrived and send a WhatsApp notification to the resident.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedVisitor && (
                        <div className="py-4 space-y-4">
                            <div className="bg-manzhil-teal/5 rounded-lg p-4 space-y-2">
                                {selectedVisitor.cnic_image_url && (
                                    <img
                                        src={selectedVisitor.cnic_image_url}
                                        alt="CNIC"
                                        className="w-full max-h-32 object-contain rounded mb-3"
                                    />
                                )}
                                <p className="text-sm text-gray-600">
                                    Visitor has arrived to visit
                                </p>
                                <p className="text-sm text-gray-600">
                                    Resident: <span className="font-medium text-manzhil-dark">{selectedVisitor.profiles?.name}</span>
                                    <span className="text-gray-400 ml-1">({selectedVisitor.profiles?.apartment_number})</span>
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsNotifyModalOpen(false)}
                            disabled={isNotifying}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleNotifyArrival}
                            disabled={isNotifying}
                            className="bg-manzhil-teal hover:bg-manzhil-dark"
                        >
                            {isNotifying ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Bell className="h-4 w-4 mr-2" />
                                    Mark Arrived & Notify
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
