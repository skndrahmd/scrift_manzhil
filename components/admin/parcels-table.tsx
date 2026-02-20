"use client"

import { useState, useRef, useMemo, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
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
    Package,
    Plus,
    Eye,
    Bell,
    CheckCircle,
    X,
    Loader2,
    Camera,
    ExternalLink,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Parcel, Profile } from "@/lib/supabase"

export function ParcelsTable() {
    const { parcels, profiles, fetchParcels, loading } = useAdmin()
    const { toast } = useToast()

    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isNotifying, setIsNotifying] = useState(false)
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
    const [collectingParcel, setCollectingParcel] = useState<Parcel | null>(null)
    const [collectorName, setCollectorName] = useState("")
    const [collectorPhone, setCollectorPhone] = useState("")
    const [collectorCnic, setCollectorCnic] = useState("")
    const [isCollecting, setIsCollecting] = useState(false)

    // Register form state
    const [selectedResidentId, setSelectedResidentId] = useState<string>("")
    const [residentSearchQuery, setResidentSearchQuery] = useState("")
    const [showResidentDropdown, setShowResidentDropdown] = useState(false)
    const residentSearchRef = useRef<HTMLDivElement>(null)
    const [description, setDescription] = useState("")
    const [senderName, setSenderName] = useState("")
    const [courierName, setCourierName] = useState("")
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Format date for display
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-PK", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    // Get status badge styling
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
            case "collected":
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Collected</Badge>
            case "returned":
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Returned</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    // Filter parcels
    const filteredParcels = parcels.filter(parcel => {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
            parcel.description?.toLowerCase().includes(searchLower) ||
            parcel.sender_name?.toLowerCase().includes(searchLower) ||
            parcel.courier_name?.toLowerCase().includes(searchLower) ||
            parcel.profiles?.name?.toLowerCase().includes(searchLower) ||
            parcel.profiles?.apartment_number?.toLowerCase().includes(searchLower)

        const matchesStatus = statusFilter === "all" || parcel.status === statusFilter

        return matchesSearch && matchesStatus
    })

    // Filtered residents for search
    const filteredResidents = useMemo(() => {
        if (!residentSearchQuery.trim()) return []
        const query = residentSearchQuery.toLowerCase()
        return profiles
            .filter(p => p.is_active && (
                p.name.toLowerCase().includes(query) ||
                p.apartment_number.toLowerCase().includes(query)
            ))
            .slice(0, 10)
    }, [profiles, residentSearchQuery])

    // Click outside handler for resident search dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (residentSearchRef.current && !residentSearchRef.current.contains(e.target as Node)) {
                setShowResidentDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Invalid File",
                    description: "Please select an image file",
                    variant: "destructive",
                })
                return
            }
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    // Reset form
    const resetForm = () => {
        setSelectedResidentId("")
        setResidentSearchQuery("")
        setShowResidentDropdown(false)
        setDescription("")
        setSenderName("")
        setCourierName("")
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    // Handle register parcel
    const handleRegisterParcel = async () => {
        if (!selectedResidentId) {
            toast({
                title: "Error",
                description: "Please select a resident",
                variant: "destructive",
            })
            return
        }

        if (!imageFile) {
            toast({
                title: "Error",
                description: "Please upload a parcel image",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append("resident_id", selectedResidentId)
            formData.append("image", imageFile)
            if (description) formData.append("description", description)
            if (senderName) formData.append("sender_name", senderName)
            if (courierName) formData.append("courier_name", courierName)

            const response = await fetch("/api/parcels/upload", {
                method: "POST",
                body: formData,
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Parcel Registered",
                    description: "Parcel has been registered and resident notified",
                })
                setIsRegisterModalOpen(false)
                resetForm()
                fetchParcels()
            } else {
                throw new Error(data.error || "Failed to register parcel")
            }
        } catch (error) {
            console.error("Error registering parcel:", error)
            toast({
                title: "Error",
                description: "Failed to register parcel. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle resend notification
    const handleResendNotification = async (parcel: Parcel) => {
        setIsNotifying(true)
        try {
            const response = await fetch("/api/parcels/notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parcelId: parcel.id }),
            })

            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Notification Sent",
                    description: "Resident has been notified again",
                })
                fetchParcels()
            } else {
                throw new Error(data.error || "Failed to send notification")
            }
        } catch (error) {
            console.error("Error sending notification:", error)
            toast({
                title: "Error",
                description: "Failed to send notification",
                variant: "destructive",
            })
        } finally {
            setIsNotifying(false)
        }
    }

    // Open the collect & notify modal
    const openCollectModal = (parcel: Parcel) => {
        setCollectingParcel(parcel)
        setCollectorName("")
        setCollectorPhone("")
        setCollectorCnic("")
        setIsCollectModalOpen(true)
    }

    // Handle collect & notify submission
    const handleCollectAndNotify = async () => {
        if (!collectingParcel) return
        if (!collectorName.trim() || !collectorPhone.trim() || !collectorCnic.trim()) {
            toast({ title: "All fields are required", variant: "destructive" })
            return
        }

        setIsCollecting(true)
        try {
            const response = await fetch("/api/parcels/collect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parcelId: collectingParcel.id,
                    collectorName: collectorName.trim(),
                    collectorPhone: collectorPhone.trim(),
                    collectorCnic: collectorCnic.trim(),
                }),
            })
            const data = await response.json()

            if (data.success) {
                toast({
                    title: data.notificationFailed ? "Parcel Collected (notification failed)" : "Parcel Collected",
                    description: data.notificationFailed
                        ? "Parcel marked as collected but WhatsApp notification could not be sent."
                        : "Resident has been notified of the collection.",
                })
                setIsCollectModalOpen(false)
                fetchParcels()
            } else {
                toast({ title: "Error", description: data.error || "Failed to process collection", variant: "destructive" })
            }
        } catch {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        } finally {
            setIsCollecting(false)
        }
    }

    // Open view modal
    const openViewModal = (parcel: Parcel) => {
        setSelectedParcel(parcel)
        setIsViewModalOpen(true)
    }

    // Clear filters
    const clearFilters = () => {
        setSearchQuery("")
        setStatusFilter("all")
    }

    const hasActiveFilters = searchQuery || statusFilter !== "all"

    return (
        <>
            <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
                <CardHeader className="pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-manzhil-dark">
                            <Package className="h-5 w-5 text-manzhil-teal" />
                            Parcels & Deliveries
                        </CardTitle>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search parcels..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 w-full sm:w-[200px] border-manzhil-teal/20 focus:border-manzhil-teal"
                                />
                            </div>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[130px] border-manzhil-teal/20">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="collected">Collected</SelectItem>
                                    <SelectItem value="returned">Returned</SelectItem>
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

                            {/* Register Button */}
                            <Button
                                onClick={() => setIsRegisterModalOpen(true)}
                                className="bg-manzhil-teal hover:bg-manzhil-dark"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Register Parcel
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-manzhil-teal" />
                        </div>
                    ) : filteredParcels.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No parcels found</p>
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
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block rounded-lg border border-manzhil-teal/10 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-manzhil-teal/5 hover:bg-manzhil-teal/5">
                                            <TableHead>Image</TableHead>
                                            <TableHead>Resident</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Courier</TableHead>
                                            <TableHead>Received</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredParcels.map((parcel) => (
                                            <TableRow key={parcel.id} className="hover:bg-manzhil-teal/5">
                                                <TableCell>
                                                    <a
                                                        href={parcel.image_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-12 h-12 rounded-lg overflow-hidden border border-manzhil-teal/20 hover:border-manzhil-teal transition-colors"
                                                    >
                                                        <img
                                                            src={parcel.image_url}
                                                            alt="Parcel"
                                                            loading="lazy"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-manzhil-dark">{parcel.profiles?.name || "Unknown"}</span>
                                                        <span className="text-xs text-gray-500">{parcel.profiles?.apartment_number}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-600 max-w-[200px] truncate">
                                                    {parcel.description || "—"}
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {parcel.courier_name || "—"}
                                                </TableCell>
                                                <TableCell className="text-gray-600 text-sm">
                                                    {formatDate(parcel.created_at)}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(parcel.status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openViewModal(parcel)}
                                                            className="h-8 w-8 p-0 border-manzhil-teal/30 hover:bg-manzhil-teal/10"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4 text-manzhil-teal" />
                                                        </Button>

                                                        {parcel.status === "pending" && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleResendNotification(parcel)}
                                                                    disabled={isNotifying}
                                                                    className="h-8 px-3 border-manzhil-teal/30 hover:bg-manzhil-teal/10 text-manzhil-teal"
                                                                    title="Resend Notification"
                                                                >
                                                                    <Bell className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openCollectModal(parcel)}
                                                                    className="h-8 px-3 border-green-300 hover:bg-green-50 text-green-600"
                                                                    title="Collect & Notify"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
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

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {filteredParcels.map((parcel) => (
                                    <Card key={parcel.id} className="border-manzhil-teal/10 shadow-sm">
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex gap-3">
                                                <a
                                                    href={parcel.image_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-16 h-16 rounded-lg overflow-hidden border border-manzhil-teal/20 flex-shrink-0"
                                                >
                                                    <img
                                                        src={parcel.image_url}
                                                        alt="Parcel"
                                                        loading="lazy"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </a>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-medium text-manzhil-dark">{parcel.profiles?.name || "Unknown"}</h3>
                                                            <p className="text-xs text-gray-500">{parcel.profiles?.apartment_number}</p>
                                                        </div>
                                                        {getStatusBadge(parcel.status)}
                                                    </div>
                                                    {parcel.description && (
                                                        <p className="text-sm text-gray-600 mt-1 truncate">{parcel.description}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Courier</span>
                                                    <span className="font-medium text-gray-700">{parcel.courier_name || "—"}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block text-xs">Received</span>
                                                    <span className="font-medium text-gray-700">{formatDate(parcel.created_at)}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-end items-center pt-3 border-t border-gray-100 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openViewModal(parcel)}
                                                    className="h-8 w-8 p-0 border-manzhil-teal/30"
                                                >
                                                    <Eye className="h-4 w-4 text-manzhil-teal" />
                                                </Button>
                                                {parcel.status === "pending" && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleResendNotification(parcel)}
                                                            disabled={isNotifying}
                                                            className="h-8 w-8 p-0 border-manzhil-teal/30 text-manzhil-teal"
                                                        >
                                                            <Bell className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openCollectModal(parcel)}
                                                            className="h-8 text-xs border-green-300 text-green-600"
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                            Collect
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* View Details Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                            <Package className="h-5 w-5 text-manzhil-teal" />
                            Parcel Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedParcel && (
                        <div className="space-y-6 py-4">
                            {/* Parcel Image */}
                            <div className="space-y-2">
                                <a
                                    href={selectedParcel.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-lg overflow-hidden border border-manzhil-teal/20 hover:border-manzhil-teal transition-colors"
                                >
                                    <img
                                        src={selectedParcel.image_url}
                                        alt="Parcel"
                                        loading="lazy"
                                        className="w-full h-48 object-cover"
                                    />
                                </a>
                                <a
                                    href={selectedParcel.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm text-manzhil-teal hover:underline"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Open full image
                                </a>
                            </div>

                            {/* Parcel Info */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Parcel Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Description</p>
                                        <p className="font-medium text-manzhil-dark">{selectedParcel.description || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        {getStatusBadge(selectedParcel.status)}
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">From</p>
                                        <p className="text-manzhil-dark">{selectedParcel.sender_name || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Courier</p>
                                        <p className="text-manzhil-dark">{selectedParcel.courier_name || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Resident Info */}
                            <div className="space-y-3 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Recipient</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Resident Name</p>
                                        <p className="font-medium text-manzhil-dark">{selectedParcel.profiles?.name || "Unknown"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Apartment</p>
                                        <p className="text-manzhil-dark">{selectedParcel.profiles?.apartment_number || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="space-y-3 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Timeline</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-500">Received</p>
                                        <p className="text-manzhil-dark">{formatDate(selectedParcel.created_at)}</p>
                                    </div>
                                    {selectedParcel.notified_at && (
                                        <div>
                                            <p className="text-xs text-gray-500">Notified</p>
                                            <p className="text-manzhil-dark">{formatDate(selectedParcel.notified_at)}</p>
                                        </div>
                                    )}
                                    {selectedParcel.collected_at && (
                                        <div>
                                            <p className="text-xs text-gray-500">Collected</p>
                                            <p className="text-manzhil-dark">{formatDate(selectedParcel.collected_at)}</p>
                                        </div>
                                    )}
                                </div>
                                {selectedParcel.collector_name && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Collected By</p>
                                        <div className="space-y-1 text-sm">
                                            <p className="text-manzhil-dark"><span className="text-gray-500">Name: </span>{selectedParcel.collector_name}</p>
                                            <p className="text-manzhil-dark"><span className="text-gray-500">Phone: </span>{selectedParcel.collector_phone}</p>
                                            <p className="text-manzhil-dark"><span className="text-gray-500">CNIC: </span>{selectedParcel.collector_cnic}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Register Parcel Modal */}
            <Dialog open={isRegisterModalOpen} onOpenChange={(open) => {
                setIsRegisterModalOpen(open)
                if (!open) resetForm()
            }}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                            <Package className="h-5 w-5 text-manzhil-teal" />
                            Register New Parcel
                        </DialogTitle>
                        <DialogDescription>
                            Upload a photo of the parcel and select the recipient to notify them.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Resident Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="resident">Recipient Resident *</Label>
                            <div className="relative" ref={residentSearchRef}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search resident by name or apartment..."
                                        value={residentSearchQuery}
                                        onChange={(e) => {
                                            setResidentSearchQuery(e.target.value)
                                            setShowResidentDropdown(true)
                                            if (!e.target.value.trim()) {
                                                setSelectedResidentId("")
                                            }
                                        }}
                                        onFocus={() => {
                                            if (residentSearchQuery.trim()) setShowResidentDropdown(true)
                                        }}
                                        className="pl-9 border-manzhil-teal/20 focus:border-manzhil-teal"
                                    />
                                </div>
                                {showResidentDropdown && filteredResidents.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-manzhil-teal/20 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                        {filteredResidents.map((profile) => (
                                            <button
                                                key={profile.id}
                                                type="button"
                                                className="w-full px-3 py-2 text-left hover:bg-manzhil-teal/5 flex justify-between items-center text-sm"
                                                onClick={() => {
                                                    setSelectedResidentId(profile.id)
                                                    setResidentSearchQuery(`${profile.name} — ${profile.apartment_number}`)
                                                    setShowResidentDropdown(false)
                                                }}
                                            >
                                                <span className="font-medium text-manzhil-dark">{profile.name}</span>
                                                <span className="text-gray-500 text-xs">{profile.apartment_number}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {showResidentDropdown && residentSearchQuery.trim() && filteredResidents.length === 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-manzhil-teal/20 rounded-md shadow-lg p-3 text-sm text-gray-500 text-center">
                                        No residents found
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Image Upload - Camera Only */}
                        <div className="space-y-2">
                            <Label>Parcel Photo *</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${imagePreview
                                    ? "border-manzhil-teal bg-manzhil-teal/5"
                                    : "border-gray-300 hover:border-manzhil-teal"
                                    }`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="max-h-40 mx-auto rounded-lg"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-0 right-0 h-6 w-6 p-0 bg-red-100 hover:bg-red-200 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setImageFile(null)
                                                setImagePreview(null)
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = ""
                                                }
                                            }}
                                        >
                                            <X className="h-3 w-3 text-red-600" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <div className="flex justify-center text-gray-400 mb-2">
                                            <Camera className="h-10 w-10" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-600">Tap to open camera</p>
                                        <p className="text-xs text-gray-400 mt-1">Take a photo of the parcel from your mobile phone</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="e.g., Large box, fragile label"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="border-manzhil-teal/20"
                            />
                        </div>

                        {/* Sender and Courier */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sender">Sender Name (optional)</Label>
                                <Input
                                    id="sender"
                                    placeholder="e.g., Amazon"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    className="border-manzhil-teal/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="courier">Courier (optional)</Label>
                                <Input
                                    id="courier"
                                    placeholder="e.g., TCS, Leopards"
                                    value={courierName}
                                    onChange={(e) => setCourierName(e.target.value)}
                                    className="border-manzhil-teal/20"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsRegisterModalOpen(false)
                                resetForm()
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRegisterParcel}
                            disabled={isSubmitting || !selectedResidentId || !imageFile}
                            className="bg-manzhil-teal hover:bg-manzhil-dark"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <Package className="h-4 w-4 mr-2" />
                                    Register & Notify
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Collect & Notify Modal */}
            <Dialog open={isCollectModalOpen} onOpenChange={(open) => { if (!isCollecting) setIsCollectModalOpen(open) }}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Collect &amp; Notify
                        </DialogTitle>
                        <DialogDescription>
                            Enter the details of the person collecting this parcel. The resident will be notified via WhatsApp.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="collector-name">Collector Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="collector-name"
                                placeholder="Full name"
                                value={collectorName}
                                onChange={(e) => setCollectorName(e.target.value)}
                                disabled={isCollecting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="collector-phone">Collector Phone <span className="text-red-500">*</span></Label>
                            <Input
                                id="collector-phone"
                                placeholder="+92300..."
                                value={collectorPhone}
                                onChange={(e) => setCollectorPhone(e.target.value)}
                                disabled={isCollecting}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="collector-cnic">Collector CNIC <span className="text-red-500">*</span></Label>
                            <Input
                                id="collector-cnic"
                                placeholder="42101-1234567-1"
                                value={collectorCnic}
                                onChange={(e) => setCollectorCnic(e.target.value)}
                                disabled={isCollecting}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCollectModalOpen(false)}
                            disabled={isCollecting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCollectAndNotify}
                            disabled={isCollecting || !collectorName.trim() || !collectorPhone.trim() || !collectorCnic.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isCollecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                "Confirm Collection"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
