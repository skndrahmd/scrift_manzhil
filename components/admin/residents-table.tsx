"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useAdmin } from "@/app/admin/layout"
import { supabase, type Profile } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
    Send,
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

export function ResidentsTable() {
    const { profiles, fetchProfiles } = useAdmin()
    const { toast } = useToast()

    // Local state
    const [searchTerm, setSearchTerm] = useState("")
    const [maintenanceFilter, setMaintenanceFilter] = useState("all")
    const [residentsPeriod, setResidentsPeriod] = useState<Period>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [isAddUserOpen, setIsAddUserOpen] = useState(false)
    const [isEditUserOpen, setIsEditUserOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [updatingMaintenanceId, setUpdatingMaintenanceId] = useState<string | null>(null)
    const [selectedResidents, setSelectedResidents] = useState<string[]>([])
    const [sendingBulkReminder, setSendingBulkReminder] = useState(false)
    const [newUser, setNewUser] = useState({
        name: "",
        phone_number: "",
        cnic: "",
        apartment_number: "",
        maintenance_charges: 5000,
    })

    const itemsPerPage = 10

    // Filter profiles
    const filteredProfiles = useMemo(() => {
        return profiles.filter((profile) => {
            const matchesSearch =
                !searchTerm ||
                profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                profile.phone_number?.includes(searchTerm) ||
                profile.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())

            const matchesMaintenance =
                maintenanceFilter === "all" ||
                (maintenanceFilter === "paid" && profile.maintenance_paid) ||
                (maintenanceFilter === "unpaid" && !profile.maintenance_paid)

            return matchesSearch && matchesMaintenance
        })
    }, [profiles, searchTerm, maintenanceFilter])

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

        const { error } = await supabase.from("profiles").insert([{
            ...newUser,
            phone_number: formattedPhone,
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

            setNewUser({
                name: "",
                phone_number: "",
                cnic: "",
                apartment_number: "",
                maintenance_charges: 5000,
            })
            setIsAddUserOpen(false)
            fetchProfiles()
        }
    }

    const editUser = async () => {
        if (!editingUser) return

        const { error } = await supabase
            .from("profiles")
            .update({
                name: editingUser.name,
                phone_number: editingUser.phone_number.startsWith("+")
                    ? editingUser.phone_number
                    : `+${editingUser.phone_number}`,
                cnic: editingUser.cnic,
                apartment_number: editingUser.apartment_number,
                maintenance_charges: editingUser.maintenance_charges,
                updated_at: new Date().toISOString(),
            })
            .eq("id", editingUser.id)

        if (error) {
            toast({ title: "Error", description: "Failed to update user", variant: "destructive" })
        } else {
            toast({ title: "Success", description: "User updated successfully" })
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

    const updateMaintenanceStatus = async (profileId: string, isPaid: boolean) => {
        setUpdatingMaintenanceId(profileId)
        try {
            const now = new Date()
            const year = now.getFullYear()
            const month = now.getMonth() + 1

            let { data: payment } = await supabase
                .from("maintenance_payments")
                .select("id")
                .eq("profile_id", profileId)
                .eq("year", year)
                .eq("month", month)
                .maybeSingle()

            if (!payment) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("maintenance_charges")
                    .eq("id", profileId)
                    .single()

                const { data: newPayment } = await supabase
                    .from("maintenance_payments")
                    .insert({
                        profile_id: profileId,
                        year,
                        month,
                        amount: profile?.maintenance_charges || 5000,
                        status: "unpaid",
                    })
                    .select("id")
                    .single()

                payment = newPayment
            }

            if (payment) {
                const response = await fetch("/api/maintenance/update-status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: payment.id, isPaid }),
                })

                if (!response.ok) throw new Error("Failed to update payment status")

                toast({
                    title: "Success",
                    description: isPaid ? "Marked as paid and resident notified" : "Marked as unpaid",
                })
            }

            fetchProfiles()
        } catch (error) {
            toast({ title: "Error", description: "Failed to update maintenance status", variant: "destructive" })
        } finally {
            setUpdatingMaintenanceId(null)
        }
    }

    const toggleResidentSelection = (profileId: string) => {
        setSelectedResidents(prev =>
            prev.includes(profileId)
                ? prev.filter(id => id !== profileId)
                : [...prev, profileId]
        )
    }

    const toggleAllUnpaidResidents = () => {
        const unpaidIds = filteredProfiles.filter(p => !p.maintenance_paid).map(p => p.id)
        if (selectedResidents.length === unpaidIds.length) {
            setSelectedResidents([])
        } else {
            setSelectedResidents(unpaidIds)
        }
    }

    const sendBulkMaintenanceReminder = async () => {
        setSendingBulkReminder(true)
        try {
            const response = await fetch("/api/cron/maintenance-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileIds: selectedResidents }),
            })
            if (response.ok) {
                toast({ title: "Success", description: `Reminders sent to ${selectedResidents.length} residents` })
                setSelectedResidents([])
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send reminders", variant: "destructive" })
        } finally {
            setSendingBulkReminder(false)
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
                                className="pl-9 w-[200px] border-manzhil-teal/20 focus:border-manzhil-teal"
                            />
                        </div>

                        {/* Status Filter */}
                        <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}>
                            <SelectTrigger className="w-[130px] border-manzhil-teal/20">
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
                            <SelectTrigger className="w-[130px] border-manzhil-teal/20">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="daily">Today</SelectItem>
                                <SelectItem value="weekly">This Week</SelectItem>
                                <SelectItem value="monthly">This Month</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Bulk Reminder Button */}
                        {selectedResidents.length > 0 && (
                            <Button
                                onClick={sendBulkMaintenanceReminder}
                                disabled={sendingBulkReminder}
                                size="sm"
                                className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all"
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Send Reminder ({selectedResidents.length})
                            </Button>
                        )}

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
                                        { header: "Status", dataKey: "status" },
                                    ],
                                    rows: residentsDisplay.map((p) => ({
                                        name: p.name || "N/A",
                                        phone: p.phone_number || "N/A",
                                        apartment: p.apartment_number || "N/A",
                                        status: p.maintenance_paid ? "Paid" : "Unpaid",
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

                        {/* Add Resident */}
                        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add Resident
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Resident</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name *</Label>
                                        <Input
                                            id="name"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="phone" className="text-right">Phone *</Label>
                                        <Input
                                            id="phone"
                                            value={newUser.phone_number}
                                            onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                                            className="col-span-3"
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="apartment" className="text-right">Apartment *</Label>
                                        <Input
                                            id="apartment"
                                            value={newUser.apartment_number}
                                            onChange={(e) => setNewUser({ ...newUser, apartment_number: e.target.value })}
                                            className="col-span-3"
                                            placeholder="A-101"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="cnic" className="text-right">CNIC</Label>
                                        <Input
                                            id="cnic"
                                            value={newUser.cnic}
                                            onChange={(e) => setNewUser({ ...newUser, cnic: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="maintenance" className="text-right">Maintenance</Label>
                                        <Input
                                            id="maintenance"
                                            type="number"
                                            value={newUser.maintenance_charges}
                                            onChange={(e) => setNewUser({ ...newUser, maintenance_charges: Number(e.target.value) })}
                                            className="col-span-3"
                                        />
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
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedResidents.length === filteredProfiles.filter(p => !p.maintenance_paid).length && filteredProfiles.filter(p => !p.maintenance_paid).length > 0}
                                        onCheckedChange={toggleAllUnpaidResidents}
                                    />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Apartment</TableHead>
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
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedResidents.includes(profile.id)}
                                                onCheckedChange={() => toggleResidentSelection(profile.id)}
                                                disabled={profile.maintenance_paid}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{profile.name}</TableCell>
                                        <TableCell className="text-gray-600">{profile.phone_number}</TableCell>
                                        <TableCell className="text-gray-600">{profile.apartment_number}</TableCell>
                                        <TableCell className="text-gray-600">Rs. {profile.maintenance_charges.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={profile.maintenance_paid ? "default" : "destructive"}
                                                className={profile.maintenance_paid ? "bg-manzhil-teal/20 text-manzhil-dark" : "bg-red-100 text-red-700"}
                                            >
                                                {profile.maintenance_paid ? (
                                                    <><CheckCircle className="h-3 w-3 mr-1" />Paid</>
                                                ) : (
                                                    <><XCircle className="h-3 w-3 mr-1" />Unpaid</>
                                                )}
                                            </Badge>
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
                                                    className={`h-8 w-8 p-0 ${profile.maintenance_paid ? "text-red-600 hover:bg-red-50 border-red-200" : "text-manzhil-teal hover:bg-manzhil-teal/5 border-manzhil-teal/30"}`}
                                                    onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
                                                    disabled={updatingMaintenanceId === profile.id}
                                                >
                                                    {updatingMaintenanceId === profile.id ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    ) : profile.maintenance_paid ? (
                                                        <XCircle className="h-4 w-4" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}
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
                                            <h3 className="font-medium text-manzhil-dark">{profile.name}</h3>
                                            <p className="text-sm text-gray-500">{profile.apartment_number}</p>
                                        </div>
                                        <Checkbox
                                            checked={selectedResidents.includes(profile.id)}
                                            onCheckedChange={() => toggleResidentSelection(profile.id)}
                                            disabled={profile.maintenance_paid}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-500 block">Phone</span>
                                            <span className="font-medium text-gray-700">{profile.phone_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Maintenance</span>
                                            <span className="font-medium text-gray-700">Rs. {profile.maintenance_charges.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <Badge
                                            variant={profile.maintenance_paid ? "default" : "destructive"}
                                            className={profile.maintenance_paid ? "bg-manzhil-teal/20 text-manzhil-dark" : "bg-red-100 text-red-700"}
                                        >
                                            {profile.maintenance_paid ? "Paid" : "Unpaid"}
                                        </Badge>
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
                                                className="h-8 w-8"
                                                onClick={() => updateMaintenanceStatus(profile.id, !profile.maintenance_paid)}
                                                disabled={updatingMaintenanceId === profile.id}
                                            >
                                                {updatingMaintenanceId === profile.id ? (
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                ) : profile.maintenance_paid ? (
                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                ) : (
                                                    <CheckCircle className="h-4 w-4 text-manzhil-teal" />
                                                )}
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Resident</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Name</Label>
                                <Input
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Phone</Label>
                                <Input
                                    value={editingUser.phone_number}
                                    onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Apartment</Label>
                                <Input
                                    value={editingUser.apartment_number}
                                    onChange={(e) => setEditingUser({ ...editingUser, apartment_number: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Maintenance</Label>
                                <Input
                                    type="number"
                                    value={editingUser.maintenance_charges}
                                    onChange={(e) => setEditingUser({ ...editingUser, maintenance_charges: Number(e.target.value) })}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
                        <Button onClick={editUser} className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg transition-all">Save Changes</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

export default ResidentsTable
