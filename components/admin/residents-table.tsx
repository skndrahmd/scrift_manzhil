"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useAdmin } from "@/app/admin/layout"
import { supabase, type Profile } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Users,
    Search,
    Filter,
    UserPlus,
    CheckCircle,
    XCircle,
    Edit,
    Trash2,
    Eye,
    Upload,
    Star,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"
import { BulkImportModal } from "./bulk-import-modal"
import { syncResidentTypeForUnit } from "@/lib/services/resident-type-sync"

export function ResidentsTable() {
    const { profiles, units, fetchProfiles, fetchUnits } = useAdmin()
    const { toast } = useToast()

    // Local state
    const [searchTerm, setSearchTerm] = useState("")
    const [maintenanceFilter, setMaintenanceFilter] = useState("all")
    const [residentsPeriod, setResidentsPeriod] = useState<Period>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [isAddUserOpen, setIsAddUserOpen] = useState(false)
    const [isEditUserOpen, setIsEditUserOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [newUser, setNewUser] = useState({
        name: "",
        phone_number: "",
        cnic: "",
        apartment_number: "",
        resident_type: "tenant" as "tenant" | "owner",
    })
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)

    const itemsPerPage = 10

    // Build unit lookup for maintenance status
    const unitMap = useMemo(() => {
        const map = new Map<string, typeof units[0]>()
        units.forEach((u) => map.set(u.id, u))
        return map
    }, [units])

    const isPrimary = (profile: Profile) => {
        if (profile.is_primary_resident) return true
        // If no explicit primary, check if they're the only active resident in the unit
        if (!profile.unit_id) return false
        const unit = unitMap.get(profile.unit_id)
        if (!unit) return false
        const activeResidents = (unit.profiles || []).filter((r) => r.is_active)
        return activeResidents.length === 1 && activeResidents[0].id === profile.id
    }

    // Maintenance status comes from the unit
    const getMaintenanceStatus = (profile: Profile): boolean => {
        if (!profile.unit_id) return false
        const unit = unitMap.get(profile.unit_id)
        return unit?.maintenance_paid ?? false
    }

    const getUnitCharges = (profile: Profile): number | null => {
        if (!profile.unit_id) return null
        const unit = unitMap.get(profile.unit_id)
        return unit?.maintenance_charges ?? null
    }

    // Filter profiles
    const filteredProfiles = useMemo(() => {
        return profiles.filter((profile) => {
            const matchesSearch =
                !searchTerm ||
                profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                profile.phone_number?.includes(searchTerm) ||
                profile.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())

            const status = getMaintenanceStatus(profile)
            const matchesMaintenance =
                maintenanceFilter === "all" ||
                (maintenanceFilter === "paid" && status) ||
                (maintenanceFilter === "unpaid" && !status)

            return matchesSearch && matchesMaintenance
        })
    }, [profiles, searchTerm, maintenanceFilter, unitMap])

    const residentsDisplay = useMemo(
        () => filterByPeriod(filteredProfiles, residentsPeriod, (p) => p.created_at),
        [filteredProfiles, residentsPeriod],
    )

    // Pagination
    const paginatedResidents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return residentsDisplay.slice(startIndex, endIndex)
    }, [residentsDisplay, currentPage])

    const totalPages = Math.ceil(residentsDisplay.length / itemsPerPage)

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, maintenanceFilter, residentsPeriod])

    // Actions
    const addNewUser = async () => {
        if (!newUser.name || !newUser.phone_number || !newUser.apartment_number) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive",
            })
            return
        }

        const formattedPhone = newUser.phone_number.startsWith("+") ? newUser.phone_number : `+${newUser.phone_number}`

        // Look up unit by apartment_number
        const unit = units.find(u => u.apartment_number === newUser.apartment_number)

        const { error } = await supabase.from("profiles").insert([{
            name: newUser.name,
            phone_number: formattedPhone,
            cnic: newUser.cnic,
            apartment_number: newUser.apartment_number,
            unit_id: unit?.id || null,
            resident_type: newUser.resident_type,
        }])

        if (error) {
            toast({
                title: "Error",
                description: "Failed to add user: " + error.message,
                variant: "destructive",
            })
        } else {
            toast({
                title: "Success",
                description: "User added successfully",
            })

            // Send welcome message
            try {
                await fetch("/api/residents/welcome-message", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: newUser.name,
                        phone_number: formattedPhone,
                        apartment_number: newUser.apartment_number,
                    }),
                })
            } catch (e) {
                console.error("Welcome message error:", e)
            }

            // Sync resident_type across all residents in the unit
            if (unit?.id) {
                syncResidentTypeForUnit(unit.id, newUser.resident_type).catch(e =>
                    console.error("Failed to sync resident_type:", e)
                )
            }

            setNewUser({
                name: "",
                phone_number: "",
                cnic: "",
                apartment_number: "",
                resident_type: "tenant",
            })
            setIsAddUserOpen(false)
            fetchProfiles()
        }
    }

    const editUser = async () => {
        if (!editingUser) return

        // Look up unit by apartment_number
        const unit = units.find(u => u.apartment_number === editingUser.apartment_number)

        const { error } = await supabase
            .from("profiles")
            .update({
                name: editingUser.name,
                phone_number: editingUser.phone_number.startsWith("+")
                    ? editingUser.phone_number
                    : `+${editingUser.phone_number}`,
                cnic: editingUser.cnic,
                apartment_number: editingUser.apartment_number,
                unit_id: unit?.id || editingUser.unit_id || null,
                resident_type: editingUser.resident_type || "tenant",
                updated_at: new Date().toISOString(),
            })
            .eq("id", editingUser.id)

        if (error) {
            toast({ title: "Error", description: "Failed to update user", variant: "destructive" })
        } else {
            toast({ title: "Success", description: "User updated successfully" })

            // Sync resident_type across all residents in the unit
            const unitId = unit?.id || editingUser.unit_id
            if (unitId) {
                syncResidentTypeForUnit(unitId, editingUser.resident_type || "tenant").catch(e =>
                    console.error("Failed to sync resident_type:", e)
                )
            }

            setEditingUser(null)
            setIsEditUserOpen(false)
            fetchProfiles()
        }
    }

    const deleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to delete ${userName}?`)) return

        const { error } = await supabase.from("profiles").delete().eq("id", userId)

        if (error) {
            toast({ title: "Error", description: "Failed to delete user", variant: "destructive" })
        } else {
            toast({ title: "Success", description: "User deleted successfully" })
            fetchProfiles()
        }
    }

    return (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
            <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-manzhil-dark">
                        <Users className="h-5 w-5 text-manzhil-teal" />
                        Residents
                    </CardTitle>

                    {/* Filters and Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search residents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full sm:w-[200px] border-manzhil-teal/20 focus:border-manzhil-teal"
                            />
                        </div>

                        {/* Status Filter */}
                        <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                            <SelectTrigger className="w-full sm:w-[130px] border-manzhil-teal/20">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Period Filter */}
                        <Select value={residentsPeriod} onValueChange={(v) => setResidentsPeriod(v as Period)}>
                            <SelectTrigger className="w-full sm:w-[130px] border-manzhil-teal/20">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="daily">Today</SelectItem>
                                <SelectItem value="weekly">This Week</SelectItem>
                                <SelectItem value="monthly">This Month</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Export PDF */}
                        <Button
                            onClick={() =>
                                exportToPdf({
                                    title: "Residents Report",
                                    periodLabel: periodLabel(residentsPeriod),
                                    columns: [
                                        { header: "Name", dataKey: "name" },
                                        { header: "Phone", dataKey: "phone" },
                                        { header: "Apartment", dataKey: "apartment" },
                                        { header: "Type", dataKey: "type" },
                                        { header: "Status", dataKey: "status" },
                                    ],
                                    rows: residentsDisplay.map((p) => ({
                                        name: p.name || "N/A",
                                        phone: p.phone_number || "N/A",
                                        apartment: p.apartment_number || "N/A",
                                        type: p.resident_type === 'owner' ? 'Owner' : 'Tenant',
                                        status: getMaintenanceStatus(p) ? "Paid" : "Unpaid",
                                    })),
                                    fileName: `residents-${residentsPeriod}.pdf`,
                                })
                            }
                            variant="outline"
                            size="sm"
                            className="border-manzhil-teal/30 text-manzhil-dark hover:bg-manzhil-teal/5"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Export PDF
                        </Button>

                        {/* Bulk Import */}
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-manzhil-teal/30 text-manzhil-dark hover:bg-manzhil-teal/5"
                            onClick={() => setIsBulkImportOpen(true)}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Bulk Import
                        </Button>

                        {/* Add Resident */}
                        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add Resident
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Add New Resident</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                        <Label htmlFor="name" className="sm:text-right">Name *</Label>
                                        <Input
                                            id="name"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                        <Label htmlFor="phone" className="sm:text-right">Phone *</Label>
                                        <Input
                                            id="phone"
                                            value={newUser.phone_number}
                                            onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                                            className="col-span-3"
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                    <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                        <Label htmlFor="apartment" className="sm:text-right">Apartment *</Label>
                                        <Input
                                            id="apartment"
                                            value={newUser.apartment_number}
                                            onChange={(e) => setNewUser({ ...newUser, apartment_number: e.target.value })}
                                            className="col-span-3"
                                            placeholder="A-101"
                                        />
                                    </div>
                                    <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                        <Label htmlFor="cnic" className="sm:text-right">CNIC</Label>
                                        <Input
                                            id="cnic"
                                            value={newUser.cnic}
                                            onChange={(e) => setNewUser({ ...newUser, cnic: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                        <Label htmlFor="resident_type" className="sm:text-right">Type</Label>
                                        <Select
                                            value={newUser.resident_type}
                                            onValueChange={(v) => setNewUser({ ...newUser, resident_type: v as "tenant" | "owner" })}
                                        >
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tenant">Tenant</SelectItem>
                                                <SelectItem value="owner">Owner</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                                    <Button onClick={addNewUser} className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg transition-all">Add Resident</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Apartment</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Maintenance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedResidents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No residents found</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedResidents.map((profile) => (
                                    <TableRow key={profile.id} className="hover:bg-manzhil-teal/5 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {profile.name}
                                                {isPrimary(profile) ? (
                                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs px-1.5 py-0">
                                                        <Star className="h-2.5 w-2.5 mr-0.5" />Primary
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500 border-gray-300 text-xs px-1.5 py-0">
                                                        Secondary
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{profile.phone_number}</TableCell>
                                        <TableCell className="text-gray-600">{profile.apartment_number}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={profile.resident_type === 'owner'
                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                    : "bg-gray-50 text-gray-600 border-gray-200"
                                                }
                                            >
                                                {profile.resident_type === 'owner' ? 'Owner' : 'Tenant'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-600">{(() => { const charges = getUnitCharges(profile); return charges != null ? `Rs. ${charges.toLocaleString()}` : '—' })()}</TableCell>
                                        <TableCell>
                                            {isPrimary(profile) ? (
                                                <Badge
                                                    variant={getMaintenanceStatus(profile) ? "default" : "destructive"}
                                                    className={getMaintenanceStatus(profile) ? "bg-manzhil-teal/20 text-manzhil-dark" : "bg-red-100 text-red-700"}
                                                >
                                                    {getMaintenanceStatus(profile) ? (
                                                        <><CheckCircle className="h-3 w-3 mr-1" />Paid</>
                                                    ) : (
                                                        <><XCircle className="h-3 w-3 mr-1" />Unpaid</>
                                                    )}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-gray-400">N/A</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Link href={`/admin/residents/${profile.id}`}>
                                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-manzhil-teal/30 hover:bg-manzhil-teal/10">
                                                        <Eye className="h-4 w-4 text-manzhil-teal" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 border-manzhil-teal/30 hover:bg-manzhil-teal/10"
                                                    onClick={() => {
                                                        setEditingUser(profile)
                                                        setIsEditUserOpen(true)
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 text-manzhil-teal" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-200"
                                                    onClick={() => deleteUser(profile.id, profile.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {paginatedResidents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">No residents found</p>
                        </div>
                    ) : (
                        paginatedResidents.map((profile) => (
                            <Card key={profile.id} className="border-manzhil-teal/10 shadow-sm">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-manzhil-dark">{profile.name}</h3>
                                                {isPrimary(profile) ? (
                                                    <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1 py-0">
                                                        <Star className="h-2 w-2 mr-0.5" />Primary
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500 border-gray-300 text-[10px] px-1 py-0">
                                                        Secondary
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">{profile.apartment_number}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500 block">Phone</span>
                                            <span className="font-medium text-gray-700">{profile.phone_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Type</span>
                                            <Badge
                                                variant="outline"
                                                className={profile.resident_type === 'owner'
                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                    : "bg-gray-50 text-gray-600 border-gray-200"
                                                }
                                            >
                                                {profile.resident_type === 'owner' ? 'Owner' : 'Tenant'}
                                            </Badge>
                                        </div>
                                        {(() => { const charges = getUnitCharges(profile); return charges != null ? (
                                            <div>
                                                <span className="text-gray-500 block">Maintenance</span>
                                                <span className="font-medium text-gray-700">Rs. {charges.toLocaleString()}</span>
                                            </div>
                                        ) : null })()}
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        {isPrimary(profile) ? (
                                            <Badge
                                                variant={getMaintenanceStatus(profile) ? "default" : "destructive"}
                                                className={getMaintenanceStatus(profile) ? "bg-manzhil-teal/20 text-manzhil-dark" : "bg-red-100 text-red-700"}
                                            >
                                                {getMaintenanceStatus(profile) ? "Paid" : "Unpaid"}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-gray-400">No dues</span>
                                        )}
                                        <div className="flex gap-2">
                                            <Link href={`/admin/residents/${profile.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500"
                                                onClick={() => {
                                                    setEditingUser(profile)
                                                    setIsEditUserOpen(true)
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600"
                                                onClick={() => deleteUser(profile.id, profile.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                                {[...Array(totalPages)].map((_, i) => (
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
                    </div>
                )}
            </CardContent>

            {/* Edit Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Resident</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label className="sm:text-right">Name</Label>
                                <Input
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label className="sm:text-right">Phone</Label>
                                <Input
                                    value={editingUser.phone_number}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label className="sm:text-right">Apartment</Label>
                                <Input
                                    value={editingUser.apartment_number}
                                    onChange={(e) => setEditingUser({ ...editingUser, apartment_number: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label className="sm:text-right">Type</Label>
                                <Select
                                    value={editingUser.resident_type || "tenant"}
                                    onValueChange={(v) => setEditingUser({ ...editingUser, resident_type: v as "tenant" | "owner" })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tenant">Tenant</SelectItem>
                                        <SelectItem value="owner">Owner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
                        <Button onClick={editUser} className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg transition-all">Save Changes</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Import Modal */}
            <BulkImportModal
                open={isBulkImportOpen}
                onOpenChange={setIsBulkImportOpen}
                onImportComplete={fetchProfiles}
            />
        </Card>
    )
}

export default ResidentsTable
