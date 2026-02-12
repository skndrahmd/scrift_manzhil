"use client"

import { useAdmin } from "../layout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Building,
    Search,
    Users,
    CheckCircle,
    AlertTriangle,
    CreditCard,
    ChevronRight,
    Home,
    Plus,
    Upload,
    Loader2,
    Bell,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import type { Complaint } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { BulkImportUnitsModal } from "@/components/admin/bulk-import-units-modal"

export default function UnitsPage() {
    const { units, complaints, loading, fetchUnits } = useAdmin()
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all")

    // Add Unit dialog state
    const [isAddUnitOpen, setIsAddUnitOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [newUnit, setNewUnit] = useState({
        apartment_number: "",
        floor_number: "",
        unit_type: "",
        maintenance_charges: "",
    })

    // Bulk import state
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)

    // Bulk reminder state
    const [sendingBulk, setSendingBulk] = useState(false)

    // Enrich units with computed data from pre-loaded profiles
    const enrichedUnits = useMemo(() => {
        return units.map((unit) => {
            const residents = unit.profiles || []
            const activeResidents = residents.filter((r) => r.is_active)
            const primaryResident =
                residents.find((r) => r.is_primary_resident && r.is_active) ||
                activeResidents[0] ||
                null

            // Get complaints for this unit
            const unitComplaints = complaints.filter((c: Complaint) =>
                residents.some((r) => r.id === c.profile_id)
            )
            const activeComplaints = unitComplaints.filter(
                (c: Complaint) => c.status === "pending" || c.status === "in-progress"
            )

            return {
                ...unit,
                residents,
                primaryResident,
                totalResidents: residents.length,
                activeResidents: activeResidents.length,
                activeComplaints: activeComplaints.length,
                totalComplaints: unitComplaints.length,
            }
        }).sort((a, b) => {
            const numA = parseInt(a.apartment_number)
            const numB = parseInt(b.apartment_number)
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB
            return a.apartment_number.localeCompare(b.apartment_number)
        })
    }, [units, complaints])

    // Filter units
    const filteredUnits = useMemo(() => {
        return enrichedUnits.filter((unit) => {
            const matchesSearch =
                !searchQuery ||
                unit.apartment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                unit.primaryResident?.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                unit.residents.some((r) =>
                    r.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "paid" && unit.maintenance_paid) ||
                (statusFilter === "unpaid" && !unit.maintenance_paid)

            return matchesSearch && matchesStatus
        })
    }, [enrichedUnits, searchQuery, statusFilter])

    // Stats
    const totalUnits = enrichedUnits.length
    const paidUnits = enrichedUnits.filter((u) => u.maintenance_paid).length
    const unpaidUnits = enrichedUnits.filter((u) => !u.maintenance_paid).length
    const unitsWithComplaints = enrichedUnits.filter((u) => u.activeComplaints > 0).length
    const complianceRate = totalUnits > 0 ? Math.round((paidUnits / totalUnits) * 100) : 0

    // Handle Add Unit submit
    const handleAddUnit = async () => {
        if (!newUnit.apartment_number.trim()) {
            toast({
                title: "Validation Error",
                description: "Apartment number is required.",
                variant: "destructive",
            })
            return
        }

        if (!newUnit.maintenance_charges || isNaN(parseFloat(newUnit.maintenance_charges)) || parseFloat(newUnit.maintenance_charges) <= 0) {
            toast({
                title: "Validation Error",
                description: "Maintenance charges are required and must be greater than 0.",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/units", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apartment_number: newUnit.apartment_number.trim(),
                    floor_number: newUnit.floor_number.trim() || null,
                    unit_type: newUnit.unit_type || null,
                    maintenance_charges: parseFloat(newUnit.maintenance_charges),
                }),
            })

            if (response.status === 409) {
                toast({
                    title: "Duplicate Unit",
                    description: "A unit with this apartment number already exists.",
                    variant: "destructive",
                })
                return
            }

            if (!response.ok) {
                throw new Error("Failed to create unit")
            }

            toast({
                title: "Unit Created",
                description: `Unit ${newUnit.apartment_number} has been added successfully.`,
            })

            setIsAddUnitOpen(false)
            setNewUnit({ apartment_number: "", floor_number: "", unit_type: "", maintenance_charges: "" })
            await fetchUnits()
        } catch (error) {
            console.error("Error creating unit:", error)
            toast({
                title: "Error",
                description: "Failed to create unit. Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Bulk reminder handler
    const handleBulkReminder = async () => {
        const unpaidUnitIds = enrichedUnits.filter((u) => !u.maintenance_paid).map((u) => u.id)
        if (unpaidUnitIds.length === 0) return

        setSendingBulk(true)
        try {
            const res = await fetch("/api/maintenance/bulk-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ unitIds: unpaidUnitIds }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed to send reminders")
            toast({
                title: "Reminders Sent",
                description: `Sent: ${result.sent}, Failed: ${result.failed} out of ${result.total} units`,
            })
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to send reminders", variant: "destructive" })
        } finally {
            setSendingBulk(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Building className="h-6 w-6 text-manzhil-teal" />
                    <h1 className="text-2xl font-medium text-manzhil-dark">Units</h1>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="border-0 shadow-lg animate-pulse">
                            <CardContent className="p-5 h-28" />
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Building className="h-6 w-6 text-manzhil-teal" />
                    <h1 className="text-2xl font-medium text-manzhil-dark">Units</h1>
                    <Badge variant="outline" className="text-sm">{totalUnits} total</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkReminder}
                        disabled={sendingBulk || unpaidUnits === 0}
                    >
                        {sendingBulk ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                        Remind All Unpaid
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBulkImportOpen(true)}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Bulk Import
                    </Button>
                    <Button
                        size="sm"
                        className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
                        onClick={() => setIsAddUnitOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Unit
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Home className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Total Units</p>
                        <p className="text-4xl font-medium text-white mb-2">{totalUnits}</p>
                        <p className="text-xs text-white/70 font-medium">
                            {enrichedUnits.reduce((sum, u) => sum + u.activeResidents, 0)} active residents
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Maintenance Paid</p>
                        <p className="text-4xl font-medium text-white mb-2">{paidUnits}</p>
                        <p className="text-xs text-white/70 font-medium">{complianceRate}% compliance</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Dues Pending</p>
                        <p className="text-4xl font-medium text-white mb-2">{unpaidUnits}</p>
                        <p className="text-xs text-white/70 font-medium">{totalUnits - paidUnits - unpaidUnits > 0 ? `${totalUnits - paidUnits - unpaidUnits} overdue` : "units unpaid"}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Active Complaints</p>
                        <p className="text-4xl font-medium text-white mb-2">{unitsWithComplaints}</p>
                        <p className="text-xs text-white/70 font-medium">units with open issues</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by unit number or resident name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 border-manzhil-teal/20 focus:border-manzhil-teal"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                            <SelectTrigger className="w-full sm:w-[180px] border-manzhil-teal/20">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Units</SelectItem>
                                <SelectItem value="paid">Maintenance Paid</SelectItem>
                                <SelectItem value="unpaid">Dues Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Units Grid */}
            {filteredUnits.length === 0 ? (
                <Card className="border-0 shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Building className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Units Found</h3>
                        <p className="text-gray-500 max-w-md">
                            {searchQuery || statusFilter !== "all"
                                ? "No units match your current filters. Try adjusting your search."
                                : "No apartments have been registered yet. Add residents to create units."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUnits.map((unit) => (
                        <Link
                            key={unit.id}
                            href={`/admin/units/${unit.id}`}
                        >
                            <Card className="border-0 shadow-lg shadow-manzhil-teal/5 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer group">
                                <CardContent className="p-5">
                                    {/* Unit Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 min-w-12 px-2 rounded-xl bg-gradient-to-br from-manzhil-dark to-manzhil-teal flex items-center justify-center text-white font-medium text-xs shadow-md shrink-0">
                                                {unit.apartment_number}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-manzhil-dark text-lg">
                                                    Unit {unit.apartment_number}
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    {unit.activeResidents} resident{unit.activeResidents !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-manzhil-teal transition-colors" />
                                    </div>

                                    {/* Primary Resident */}
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-1">Primary Resident</p>
                                        <p className="text-sm font-medium text-gray-800">
                                            {unit.primaryResident?.name || "Not assigned"}
                                        </p>
                                    </div>

                                    {/* Status Row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                            variant={unit.maintenance_paid ? "default" : "secondary"}
                                            className={
                                                unit.maintenance_paid
                                                    ? "bg-manzhil-teal/20 text-manzhil-dark border-manzhil-teal/30"
                                                    : "bg-red-100 text-red-700 border-red-200"
                                            }
                                        >
                                            {unit.maintenance_paid ? "✓ Paid" : "⚠ Unpaid"}
                                        </Badge>

                                        {unit.activeComplaints > 0 && (
                                            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                                                {unit.activeComplaints} complaint{unit.activeComplaints > 1 ? "s" : ""}
                                            </Badge>
                                        )}

                                        <Badge variant="outline" className="border-gray-200 text-gray-600">
                                            <Users className="h-3 w-3 mr-1" />
                                            {unit.activeResidents}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Add Unit Dialog */}
            <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Unit</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="apartment_number">Apartment Number *</Label>
                            <Input
                                id="apartment_number"
                                placeholder="e.g. A-101"
                                value={newUnit.apartment_number}
                                onChange={(e) => setNewUnit({ ...newUnit, apartment_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="floor_number">Floor Number</Label>
                            <Input
                                id="floor_number"
                                placeholder="e.g. 1, Ground"
                                value={newUnit.floor_number}
                                onChange={(e) => setNewUnit({ ...newUnit, floor_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit_type">Unit Type</Label>
                            <Select
                                value={newUnit.unit_type}
                                onValueChange={(v) => setNewUnit({ ...newUnit, unit_type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Studio">Studio</SelectItem>
                                    <SelectItem value="1BHK">1BHK</SelectItem>
                                    <SelectItem value="2BHK">2BHK</SelectItem>
                                    <SelectItem value="3BHK">3BHK</SelectItem>
                                    <SelectItem value="Penthouse">Penthouse</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maintenance_charges">Maintenance Charges</Label>
                            <Input
                                id="maintenance_charges"
                                type="number"
                                placeholder="5000"
                                value={newUnit.maintenance_charges}
                                onChange={(e) => setNewUnit({ ...newUnit, maintenance_charges: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddUnitOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddUnit}
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Add Unit
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Modal */}
            <BulkImportUnitsModal
                open={isBulkImportOpen}
                onOpenChange={setIsBulkImportOpen}
                onImportComplete={() => fetchUnits()}
            />
        </div>
    )
}
