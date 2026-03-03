"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdmin } from "../../layout"
import { supabase, type Profile, type MaintenancePayment, type Unit, type Staff } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Loader from "@/components/ui/loader"
import { useToast } from "@/hooks/use-toast"
import { formatDate as formatDateForDisplay } from "@/lib/date"
import {
    ChevronLeft,
    Users,
    DollarSign,
    AlertTriangle,
    Activity,
    CheckCircle,
    XCircle,
    Star,
    StarOff,
    UserPlus,
    Edit,
    Trash2,
    Building,
    Calendar,
    Package,
    Ticket,
    Loader2,
    Pencil,
    Bell,
    Download,
    FileText,
    History,
} from "lucide-react"
import { generateMaintenanceInvoicePdf, generateBookingInvoicePdf } from "@/lib/pdf/invoice"
import { syncResidentTypeForUnit } from "@/lib/services/resident-type-sync"
import { validateResident, checkPhoneExists } from "@/lib/validation/resident"
import { MaintenanceLogsModal } from "@/components/admin/maintenance-logs-table"

function formatMonth(year: number, month: number) {
    const date = new Date(year, month - 1, 1)
    return date.toLocaleString("en-US", { month: "long", year: "numeric" })
}

function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function formatTime(timeString: string) {
    const [hours, minutes] = timeString.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
}

export default function UnitDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const { toast } = useToast()
    const unitId = params.id

    const {
        units,
        complaints: allComplaints,
        bookings: allBookings,
        visitors: allVisitors,
        parcels: allParcels,
        loading: contextLoading,
        fetchProfiles,
        fetchUnits,
    } = useAdmin()

    // Find the unit from context
    const unit = useMemo(() => units.find((u) => u.id === unitId) || null, [units, unitId])
    const apartmentNumber = unit?.apartment_number || ""

    // Get residents from unit.profiles (pre-loaded via JOIN)
    const residents = useMemo(() => {
        if (!unit?.profiles) return []
        return [...unit.profiles].sort((a, b) => {
            if (a.is_primary_resident && !b.is_primary_resident) return -1
            if (!a.is_primary_resident && b.is_primary_resident) return 1
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
    }, [unit])

    const profileIds = useMemo(() => residents.map((r) => r.id), [residents])

    const complaints = useMemo(() => {
        return allComplaints
            .filter((c) => profileIds.includes(c.profile_id))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [allComplaints, profileIds])

    const bookings = useMemo(() => {
        return allBookings
            .filter((b) => profileIds.includes(b.profile_id))
            .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
    }, [allBookings, profileIds])

    const visitors = useMemo(() => {
        return allVisitors
            .filter((v) => profileIds.includes(v.resident_id))
            .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
            .slice(0, 20)
    }, [allVisitors, profileIds])

    const parcels = useMemo(() => {
        return allParcels
            .filter((p) => profileIds.includes(p.resident_id))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20)
    }, [allParcels, profileIds])

    // Staff fetched by unit_id
    const [staff, setStaff] = useState<Staff[]>([])
    const [staffLoading, setStaffLoading] = useState(true)

    // Maintenance payments fetched by unit_id
    const [payments, setPayments] = useState<MaintenancePayment[]>([])
    const [paymentsLoading, setPaymentsLoading] = useState(true)
    const [togglingPrimary, setTogglingPrimary] = useState<string | null>(null)

    // Add resident dialog state
    const [isAddResidentOpen, setIsAddResidentOpen] = useState(false)
    const [addingResident, setAddingResident] = useState(false)
    const [sendWelcomeMessage, setSendWelcomeMessage] = useState(true)
    const [newResident, setNewResident] = useState({
        name: "",
        phone_number: "",
        cnic: "",
        resident_type: "tenant" as "tenant" | "owner",
    })

    // Edit resident dialog state
    const [isEditResidentOpen, setIsEditResidentOpen] = useState(false)
    const [editingResident, setEditingResident] = useState<Profile | null>(null)
    const [editForm, setEditForm] = useState({
        name: "",
        phone_number: "",
        cnic: "",
        resident_type: "tenant" as "tenant" | "owner",
    })

    // Edit maintenance charges dialog state
    const [isEditChargesOpen, setIsEditChargesOpen] = useState(false)
    const [editCharges, setEditCharges] = useState(0)
    const [savingCharges, setSavingCharges] = useState(false)

    // Send invoice state
    const [sendingInvoice, setSendingInvoice] = useState(false)

    // Fetch staff by unit_id
    async function loadStaff() {
        if (!unit) {
            setStaff([])
            setStaffLoading(false)
            return
        }
        setStaffLoading(true)
        const { data } = await supabase
            .from("staff")
            .select("*")
            .eq("unit_id", unit.id)
            .order("created_at", { ascending: false })
        setStaff((data as Staff[]) || [])
        setStaffLoading(false)
    }

    // Fetch maintenance payments by unit_id
    async function loadPayments() {
        if (!unit) {
            setPayments([])
            setPaymentsLoading(false)
            return
        }

        setPaymentsLoading(true)
        await ensureMaintenanceRecords(unit.id, unit.maintenance_charges ?? 0, unit.created_at)

        const { data: paymentsData } = await supabase
            .from("maintenance_payments")
            .select("*")
            .eq("unit_id", unit.id)
            .order("year", { ascending: false })
            .order("month", { ascending: false })
        setPayments((paymentsData as MaintenancePayment[]) || [])
        setPaymentsLoading(false)
    }

    useEffect(() => {
        if (!contextLoading && unit) {
            loadPayments()
            loadStaff()
        } else if (!contextLoading) {
            setPaymentsLoading(false)
            setStaffLoading(false)
        }
    }, [unit, contextLoading])

    async function ensureMaintenanceRecords(unitId: string, amount: number, createdAt: string) {
        // Query current primary resident from DB instead of relying on component state
        const { data: primaryRes } = await supabase
            .from("profiles")
            .select("id")
            .eq("unit_id", unitId)
            .eq("is_primary_resident", true)
            .eq("is_active", true)
            .single()
        const primaryProfileId = primaryRes?.id || null

        const createdDate = new Date(createdAt)
        const now = new Date()
        const items: { year: number; month: number }[] = []
        const currentDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1)

        while (currentDate <= now) {
            items.push({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 })
            currentDate.setMonth(currentDate.getMonth() + 1)
        }

        const { data: existing } = await supabase
            .from("maintenance_payments")
            .select("year, month")
            .eq("unit_id", unitId)
            .in("year", Array.from(new Set(items.map((x) => x.year))))

        const key = new Set((existing || []).map((e: any) => `${e.year}-${e.month}`))
        const upserts = items
            .filter((i) => !key.has(`${i.year}-${i.month}`))
            .map((i) => ({
                unit_id: unitId,
                profile_id: primaryProfileId,
                year: i.year,
                month: i.month,
                amount,
                status: "unpaid",
            }))

        if (upserts.length > 0) {
            await supabase.from("maintenance_payments").insert(upserts)
        }
    }

    // Toggle primary resident
    async function handleTogglePrimary(profileId: string) {
        setTogglingPrimary(profileId)
        try {
            const response = await fetch("/api/units/toggle-primary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileId, unitId }),
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.error || "Failed to update primary resident")
            }

            toast({ title: "Updated", description: "Primary resident changed successfully" })
            await fetchProfiles()
            await fetchUnits()
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to update", variant: "destructive" })
        } finally {
            setTogglingPrimary(null)
        }
    }

    // Add new resident to unit
    async function handleAddResident() {
        if (!unit) {
            toast({ title: "Error", description: "Unit not found", variant: "destructive" })
            return
        }

        // Validate all fields
        const validation = validateResident({
            name: newResident.name,
            phone_number: newResident.phone_number,
            apartment_number: unit.apartment_number,
            cnic: newResident.cnic,
            resident_type: newResident.resident_type,
        })

        if (!validation.isValid) {
            toast({ title: "Validation Error", description: validation.errors[0], variant: "destructive" })
            return
        }

        // Check for duplicate phone number
        const phoneExists = await checkPhoneExists(newResident.phone_number)
        if (phoneExists) {
            toast({ title: "Duplicate Phone", description: "A resident with this phone number already exists.", variant: "destructive" })
            return
        }

        setAddingResident(true)
        try {
            const isPrimary = residents.filter(r => r.is_active).length === 0
            const { error } = await supabase.from("profiles").insert({
                name: validation.normalizedData.name,
                phone_number: validation.normalizedData.phone_number,
                cnic: validation.normalizedData.cnic || null,
                apartment_number: validation.normalizedData.apartment_number,
                unit_id: unit.id,
                maintenance_charges: unit.maintenance_charges,
                is_primary_resident: isPrimary,
                is_active: true,
                maintenance_paid: false,
                resident_type: validation.normalizedData.resident_type,
            })

            if (error) {
                if (error.code === "23505") {
                    throw new Error("A resident with this phone number already exists")
                }
                throw error
            }

            toast({ title: "Added", description: `${validation.normalizedData.name} has been added to Unit ${apartmentNumber}` })

            // Sync resident_type across all residents in the unit
            if (unit.id) {
                syncResidentTypeForUnit(unit.id, validation.normalizedData.resident_type).catch(e => 
                    console.error("Failed to sync resident_type:", e)
                )
            }

            // Send welcome message (fire-and-forget, don't block on failure)
            if (sendWelcomeMessage) {
                try {
                    await fetch("/api/residents/welcome-message", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: validation.normalizedData.name,
                            phone_number: validation.normalizedData.phone_number,
                            apartment_number: validation.normalizedData.apartment_number,
                        }),
                    })
                } catch (e) {
                    console.error("Welcome message error:", e)
                }
            }

            setNewResident({ name: "", phone_number: "", cnic: "", resident_type: "tenant" })
            setSendWelcomeMessage(true)
            setIsAddResidentOpen(false)
            await fetchProfiles()
            await fetchUnits()
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to add resident", variant: "destructive" })
        } finally {
            setAddingResident(false)
        }
    }

    // Edit resident
    async function handleEditResident() {
        if (!editingResident) return
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    name: editForm.name,
                    phone_number: editForm.phone_number,
                    cnic: editForm.cnic || null,
                    resident_type: editForm.resident_type,
                })
                .eq("id", editingResident.id)

            if (error) throw error
            toast({ title: "Updated", description: "Resident updated successfully" })

            // Sync resident_type across all residents in the unit
            if (editingResident.unit_id) {
                syncResidentTypeForUnit(editingResident.unit_id, editForm.resident_type).catch(e =>
                    console.error("Failed to sync resident_type:", e)
                )
            }

            setIsEditResidentOpen(false)
            setEditingResident(null)
            await fetchProfiles()
            await fetchUnits()
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to update", variant: "destructive" })
        }
    }

    // Deactivate resident
    async function handleDeactivateResident(profile: Profile) {
        if (isPrimary(profile)) {
            toast({
                title: "Cannot deactivate",
                description: "Change primary resident before deactivating",
                variant: "destructive",
            })
            return
        }
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ is_active: false })
                .eq("id", profile.id)

            if (error) throw error
            toast({ title: "Deactivated", description: `${profile.name} has been deactivated` })
            await fetchProfiles()
            await fetchUnits()
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to deactivate", variant: "destructive" })
        }
    }

    // Update unit maintenance charges
    async function handleUpdateCharges() {
        if (!unit) return
        setSavingCharges(true)
        try {
            const response = await fetch("/api/units", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ unitId: unit.id, maintenance_charges: editCharges }),
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.error || "Failed to update")
            }
            toast({ title: "Updated", description: "Maintenance charges updated" })
            setIsEditChargesOpen(false)
            await fetchUnits()
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to update", variant: "destructive" })
        } finally {
            setSavingCharges(false)
        }
    }

    // Mark payment paid/unpaid
    async function markPayment(row: MaintenancePayment, isPaid: boolean) {
        setMarkingPaymentId(row.id)
        try {
            const response = await fetch("/api/maintenance/update-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId: row.id, isPaid }),
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.error || "Failed to update payment")
            }

            toast({ title: "Updated", description: isPaid ? "Marked as paid" : "Marked as unpaid" })
            await loadPayments()
            await fetchUnits()
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to update", variant: "destructive" })
        } finally {
            setMarkingPaymentId(null)
        }
    }

    // Send maintenance reminder state
    const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)
    const [markingPaymentId, setMarkingPaymentId] = useState<string | null>(null)

    // Invoice download state
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null)
    const [downloadingBookingId, setDownloadingBookingId] = useState<string | null>(null)

    async function sendMaintenanceReminder(paymentId: string) {
        setSendingReminderId(paymentId)
        try {
            const res = await fetch("/api/maintenance/bulk-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ unitIds: [unitId] }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed to send reminder")
            if (result.sent > 0) {
                toast({ title: "Reminder Sent", description: `Reminder sent to ${primaryResident?.name || "resident"}` })
            } else {
                toast({ title: "Failed", description: result.errors?.[0] || "Could not send reminder", variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to send reminder", variant: "destructive" })
        } finally {
            setSendingReminderId(null)
        }
    }

    async function sendInvoiceToUnit() {
        if (!unit) return
        setSendingInvoice(true)
        try {
            const res = await fetch("/api/maintenance/send-invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ unitIds: [unitId] }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed to send invoice")
            if (result.sent > 0) {
                toast({ title: "Invoice Sent", description: `Invoice sent to ${primaryResident?.name || "resident"}` })
            } else {
                toast({ title: "Failed", description: result.errors?.[0] || "Could not send invoice", variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to send invoice", variant: "destructive" })
        } finally {
            setSendingInvoice(false)
        }
    }

    async function downloadMaintenanceInvoice(payment: MaintenancePayment) {
        setDownloadingInvoiceId(payment.id)
        try {
            const paymentWithProfile = {
                ...payment,
                profiles: primaryResident ? {
                    name: primaryResident.name,
                    phone_number: primaryResident.phone_number,
                    apartment_number: primaryResident.apartment_number,
                } : null,
            }
            const { blob, fileName } = await generateMaintenanceInvoicePdf(paymentWithProfile)
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = fileName
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast({ title: "Error", description: "Failed to download invoice", variant: "destructive" })
        } finally {
            setDownloadingInvoiceId(null)
        }
    }

    async function downloadBookingInvoice(booking: any) {
        setDownloadingBookingId(booking.id)
        try {
            const { blob, fileName } = await generateBookingInvoicePdf(booking)
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = fileName
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast({ title: "Error", description: "Failed to download invoice", variant: "destructive" })
        } finally {
            setDownloadingBookingId(null)
        }
    }

    // Stats
    const activeResidents = residents.filter((r) => r.is_active)
    const isPrimary = (r: Profile) => {
        if (r.is_primary_resident) return true
        if (activeResidents.length === 1 && r.id === activeResidents[0].id) return true
        return false
    }
    const primaryResident = residents.find((r) => isPrimary(r)) || residents[0]
    const paidPayments = payments.filter((p) => p.status === "paid").length
    const unpaidPayments = payments.filter((p) => p.status !== "paid").length
    const activeComplaints = complaints.filter((c) => c.status === "pending" || c.status === "in-progress").length
    const resolvedComplaints = complaints.filter((c) => c.status === "completed").length

    if (contextLoading) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" className="text-manzhil-dark" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                    <CardContent className="flex items-center justify-center py-16">
                        <Loader />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!unit) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => router.push("/admin/units")} className="text-manzhil-dark hover:bg-manzhil-teal/10 -ml-2">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Units
                </Button>
                <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Building className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Unit Not Found</h3>
                        <p className="text-gray-500">This unit does not exist or has been removed.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Button variant="ghost" onClick={() => router.push("/admin/units")} className="text-manzhil-dark hover:bg-manzhil-teal/10 -ml-2">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Units
            </Button>

            {/* Unit Header */}
            <Card className="border-0 shadow-xl shadow-manzhil-teal/10 overflow-hidden">
                <div className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-3xl sm:text-4xl font-medium shadow-lg">
                            {apartmentNumber}
                        </div>
                        <div className="flex-1 text-white">
                            <h1 className="text-2xl sm:text-3xl font-medium mb-1">Unit {apartmentNumber}</h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/80 text-sm sm:text-base">
                                <span>{activeResidents.length} active resident{activeResidents.length !== 1 ? "s" : ""}</span>
                                <span>•</span>
                                <span>Primary: {primaryResident?.name || "Not set"}</span>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <Badge className={`text-sm px-4 py-2 ${unit.maintenance_paid ? "bg-white/20 text-white border-white/30" : "bg-red-500 text-white border-red-400"}`}>
                                {unit.maintenance_paid ? "✓ Maintenance Paid" : "⚠ Dues Pending"}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="bg-white px-6 py-4 border-t border-manzhil-teal/10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <span className="text-sm text-gray-500">Monthly Maintenance</span>
                                <p className="text-xl font-medium text-manzhil-dark">Rs. {unit.maintenance_charges?.toLocaleString() ?? "0"}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-manzhil-teal hover:bg-manzhil-teal/10"
                                onClick={() => { setEditCharges(unit.maintenance_charges); setIsEditChargesOpen(true) }}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="md:hidden">
                            <Badge className={unit.maintenance_paid ? "bg-manzhil-teal/20 text-manzhil-dark" : "bg-red-100 text-red-700"}>
                                {unit.maintenance_paid ? "✓ Paid" : "⚠ Pending"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Edit Maintenance Charges Dialog */}
            <Dialog open={isEditChargesOpen} onOpenChange={setIsEditChargesOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Edit Maintenance Charges</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Monthly Charges (Rs.)</Label>
                            <Input type="number" value={editCharges} onChange={(e) => setEditCharges(parseInt(e.target.value) || 0)} />
                        </div>
                        <Button className="w-full bg-manzhil-teal hover:bg-manzhil-dark" onClick={handleUpdateCharges} disabled={savingCharges}>
                            {savingCharges ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Residents</p>
                        <p className="text-4xl font-medium text-white mb-2">{activeResidents.length}</p>
                        <p className="text-xs text-white/70 font-medium">{residents.length - activeResidents.length} inactive</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Maintenance</p>
                        <p className="text-4xl font-medium text-white mb-2">{paidPayments} Paid</p>
                        <p className="text-xs text-white/70 font-medium">{unpaidPayments} unpaid</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Complaints</p>
                        <p className="text-4xl font-medium text-white mb-2">{resolvedComplaints} Resolved</p>
                        <p className="text-xs text-white/70 font-medium">{activeComplaints} active</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <p className="text-sm font-medium text-white/90 mb-4">Staff</p>
                        <p className="text-4xl font-medium text-white mb-2">{staff.length}</p>
                        <p className="text-xs text-white/70 font-medium">Registered members</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="residents" className="space-y-6">
                <TabsList className="bg-white h-auto w-full md:w-fit overflow-x-auto justify-start rounded-xl shadow-lg shadow-manzhil-teal/5 border border-manzhil-teal/10 p-1.5 gap-1 scrollbar-hide">
                    <TabsTrigger value="residents" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0">
                        <Users className="h-4 w-4" />
                        Residents
                        <span className="bg-white/20 text-xs rounded-full px-2 py-0.5">{activeResidents.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0">
                        <DollarSign className="h-4 w-4" />
                        <span className="hidden sm:inline">Maintenance</span>
                        <span className="sm:hidden">Dues</span>
                        {unpaidPayments > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unpaidPayments}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="complaints" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0">
                        <AlertTriangle className="h-4 w-4" />
                        Complaints
                        {activeComplaints > 0 && <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{activeComplaints}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0">
                        <Users className="h-4 w-4" />
                        Staff
                        <span className="bg-white/20 text-xs rounded-full px-2 py-0.5">{staff.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0">
                        <Activity className="h-4 w-4" />
                        Activity
                    </TabsTrigger>
                </TabsList>

                {/* ==================== RESIDENTS TAB ==================== */}
                <TabsContent value="residents">
                    <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                        <CardHeader className="bg-white">
                            <CardTitle className="flex items-center justify-between">
                                <span className="text-lg sm:text-xl">Residents</span>
                                <Dialog open={isAddResidentOpen} onOpenChange={setIsAddResidentOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="bg-manzhil-teal hover:bg-manzhil-dark text-white gap-2">
                                            <UserPlus className="h-4 w-4" />
                                            <span className="hidden sm:inline">Add Resident</span>
                                            <span className="sm:hidden">Add</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Add Resident to Unit {apartmentNumber}</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Name *</Label>
                                                <Input value={newResident.name} onChange={(e) => setNewResident({ ...newResident, name: e.target.value })} placeholder="Full name" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Phone Number *</Label>
                                                <Input value={newResident.phone_number} onChange={(e) => setNewResident({ ...newResident, phone_number: e.target.value })} placeholder="+923001234567" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>CNIC</Label>
                                                <Input value={newResident.cnic} onChange={(e) => setNewResident({ ...newResident, cnic: e.target.value })} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Type</Label>
                                                <Select
                                                    value={newResident.resident_type}
                                                    onValueChange={(v) => setNewResident({ ...newResident, resident_type: v as "tenant" | "owner" })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="tenant">Tenant</SelectItem>
                                                        <SelectItem value="owner">Owner</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="sendWelcome"
                                                    checked={sendWelcomeMessage}
                                                    onCheckedChange={(checked) => setSendWelcomeMessage(checked === true)}
                                                />
                                                <label
                                                    htmlFor="sendWelcome"
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    Send welcome message
                                                </label>
                                            </div>
                                            <Button className="w-full bg-manzhil-teal hover:bg-manzhil-dark" onClick={handleAddResident} disabled={addingResident}>
                                                {addingResident ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : "Add Resident"}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                            <TableHead>Name</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {residents.map((resident) => (
                                            <TableRow key={resident.id} className="hover:bg-manzhil-teal/5">
                                                <TableCell className="font-medium text-gray-900">{resident.name}</TableCell>
                                                <TableCell className="text-gray-600">{resident.phone_number}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={resident.resident_type === 'owner'
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : "bg-gray-50 text-gray-600 border-gray-200"
                                                        }
                                                    >
                                                        {resident.resident_type === 'owner' ? 'Owner' : 'Tenant'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {isPrimary(resident) ? (
                                                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                                            <Star className="h-3 w-3 mr-1" /> Primary
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-gray-500">Secondary</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={resident.is_active ? "default" : "secondary"} className={resident.is_active ? "bg-manzhil-teal/20 text-manzhil-dark" : ""}>
                                                        {resident.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        {!isPrimary(resident) && resident.is_active && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleTogglePrimary(resident.id)}
                                                                disabled={togglingPrimary === resident.id}
                                                                className="text-amber-600 hover:bg-amber-50"
                                                                title="Set as primary"
                                                            >
                                                                {togglingPrimary === resident.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Star className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingResident(resident)
                                                                setEditForm({
                                                                    name: resident.name,
                                                                    phone_number: resident.phone_number,
                                                                    cnic: resident.cnic || "",
                                                                    resident_type: resident.resident_type || "tenant",
                                                                })
                                                                setIsEditResidentOpen(true)
                                                            }}
                                                            className="text-manzhil-teal hover:bg-manzhil-teal/10"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        {!isPrimary(resident) && resident.is_active && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeactivateResident(resident)}
                                                                className="text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {residents.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                                    No residents in this unit
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile View */}
                            <div className="block md:hidden p-4 space-y-3">
                                {residents.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">No residents in this unit</div>
                                ) : (
                                    residents.map((resident) => (
                                        <Card key={resident.id} className="border border-gray-200 shadow-sm">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="font-medium text-manzhil-dark">{resident.name}</h3>
                                                        <p className="text-xs text-gray-500">{resident.phone_number}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <Badge
                                                            variant="outline"
                                                            className={resident.resident_type === 'owner'
                                                                ? "bg-blue-50 text-blue-700 border-blue-200 text-xs"
                                                                : "bg-gray-50 text-gray-600 border-gray-200 text-xs"
                                                            }
                                                        >
                                                            {resident.resident_type === 'owner' ? 'Owner' : 'Tenant'}
                                                        </Badge>
                                                        {isPrimary(resident) && (
                                                            <Badge className="bg-amber-100 text-amber-800 text-xs">
                                                                <Star className="h-3 w-3 mr-1" /> Primary
                                                            </Badge>
                                                        )}
                                                        <Badge variant={resident.is_active ? "default" : "secondary"} className={`text-xs ${resident.is_active ? "bg-manzhil-teal/20 text-manzhil-dark" : ""}`}>
                                                            {resident.is_active ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!isPrimary(resident) && resident.is_active && (
                                                        <Button variant="outline" size="sm" onClick={() => handleTogglePrimary(resident.id)} disabled={togglingPrimary === resident.id} className="flex-1 text-amber-600 text-xs">
                                                            {togglingPrimary === resident.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Star className="h-3 w-3 mr-1" />}
                                                            Set Primary
                                                        </Button>
                                                    )}
                                                    <Button variant="outline" size="sm" onClick={() => { setEditingResident(resident); setEditForm({ name: resident.name, phone_number: resident.phone_number, cnic: resident.cnic || "", resident_type: resident.resident_type || "tenant" }); setIsEditResidentOpen(true) }} className="flex-1 text-manzhil-teal text-xs">
                                                        <Edit className="h-3 w-3 mr-1" /> Edit
                                                    </Button>
                                                    {!isPrimary(resident) && resident.is_active && (
                                                        <Button variant="outline" size="sm" onClick={() => handleDeactivateResident(resident)} className="text-red-600 text-xs">
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Edit Resident Dialog */}
                    <Dialog open={isEditResidentOpen} onOpenChange={setIsEditResidentOpen}>
                        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Resident</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNIC</Label>
                                    <Input value={editForm.cnic} onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={editForm.resident_type}
                                        onValueChange={(v) => setEditForm({ ...editForm, resident_type: v as "tenant" | "owner" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tenant">Tenant</SelectItem>
                                            <SelectItem value="owner">Owner</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button className="w-full bg-manzhil-teal hover:bg-manzhil-dark" onClick={handleEditResident}>
                                    Save Changes
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* ==================== MAINTENANCE TAB ==================== */}
                <TabsContent value="maintenance">
                    <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                        <CardHeader className="bg-white">
                            <CardTitle className="flex items-center justify-between">
                                <span className="text-lg sm:text-xl">Maintenance Payments</span>
                                <div className="flex items-center gap-2">
                                    <MaintenanceLogsModal unitId={unitId} />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={sendInvoiceToUnit}
                                        disabled={sendingInvoice}
                                        className="text-manzhil-teal hover:bg-manzhil-teal/10"
                                    >
                                        {sendingInvoice ? (
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        ) : (
                                            <FileText className="h-4 w-4 mr-1" />
                                        )}
                                        <span className="hidden sm:inline">Send Invoice</span>
                                        <span className="sm:hidden">Invoice</span>
                                    </Button>
                                    <Badge variant="outline" className="text-sm">
                                        Unit {apartmentNumber}
                                    </Badge>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {/* Desktop */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                            <TableHead>Month</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Paid Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-manzhil-teal/5">
                                                <TableCell className="font-medium">{formatMonth(row.year, row.month)}</TableCell>
                                                <TableCell>Rs. {Number(row.amount).toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={row.status === "paid" ? "default" : "secondary"} className={row.status === "paid" ? "bg-manzhil-teal/20 text-manzhil-dark" : ""}>
                                                        {row.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{row.paid_date ? new Date(row.paid_date + "T00:00:00").toLocaleDateString("en-GB") : "—"}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => downloadMaintenanceInvoice(row)}
                                                            disabled={downloadingInvoiceId === row.id}
                                                            className="text-gray-600 hover:bg-gray-50"
                                                            title="Download invoice"
                                                        >
                                                            {downloadingInvoiceId === row.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Download className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        {row.status === "paid" ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => markPayment(row, false)}
                                                                disabled={markingPaymentId === row.id}
                                                                className="text-red-600 hover:bg-red-50"
                                                            >
                                                                {markingPaymentId === row.id ? (
                                                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                ) : (
                                                                    <XCircle className="h-4 w-4 mr-1" />
                                                                )}
                                                                Unpaid
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => sendMaintenanceReminder(row.id)}
                                                                    disabled={sendingReminderId === row.id}
                                                                    className="text-amber-600 hover:bg-amber-50 border-amber-200"
                                                                    title="Send payment reminder"
                                                                >
                                                                    {sendingReminderId === row.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Bell className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => markPayment(row, true)}
                                                                    disabled={markingPaymentId === row.id}
                                                                    className="text-manzhil-teal hover:bg-manzhil-teal/10"
                                                                >
                                                                    {markingPaymentId === row.id ? (
                                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                                    )}
                                                                    Paid
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {payments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-gray-500 py-8">No records</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile */}
                            <div className="block md:hidden p-4 space-y-3">
                                {payments.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">No records</div>
                                ) : (
                                    payments.map((row) => (
                                        <Card key={row.id} className="border border-gray-200 shadow-sm">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-base text-gray-900">{formatMonth(row.year, row.month)}</h3>
                                                        <p className="text-sm text-gray-500">Rs. {Number(row.amount).toLocaleString()}</p>
                                                    </div>
                                                    <Badge variant={row.status === "paid" ? "default" : "secondary"}>{row.status}</Badge>
                                                </div>
                                                <div className="pt-2 border-t border-gray-100 flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => downloadMaintenanceInvoice(row)}
                                                        disabled={downloadingInvoiceId === row.id}
                                                        className="text-gray-600"
                                                        title="Download invoice"
                                                    >
                                                        {downloadingInvoiceId === row.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Download className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    {row.status === "paid" ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => markPayment(row, false)}
                                                            disabled={markingPaymentId === row.id}
                                                            className="flex-1 text-red-600"
                                                        >
                                                            {markingPaymentId === row.id ? (
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 mr-2" />
                                                            )}
                                                            Mark Unpaid
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => sendMaintenanceReminder(row.id)}
                                                                disabled={sendingReminderId === row.id}
                                                                className="text-amber-600 border-amber-200"
                                                                title="Send reminder"
                                                            >
                                                                {sendingReminderId === row.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Bell className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => markPayment(row, true)}
                                                                disabled={markingPaymentId === row.id}
                                                                className="flex-1 text-manzhil-teal"
                                                            >
                                                                {markingPaymentId === row.id ? (
                                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                                )}
                                                                Mark Paid
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== COMPLAINTS TAB ==================== */}
                <TabsContent value="complaints">
                    <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                        <CardHeader className="bg-white">
                            <CardTitle className="text-lg sm:text-xl">Complaints</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                            <TableHead>ID</TableHead>
                                            <TableHead>Resident</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {complaints.map((c) => (
                                            <TableRow key={c.id} className="hover:bg-manzhil-teal/5">
                                                <TableCell className="font-mono text-sm">{c.complaint_id || c.id.substring(0, 6)}</TableCell>
                                                <TableCell className="font-medium">{c.profiles?.name || "N/A"}</TableCell>
                                                <TableCell>{c.category}</TableCell>
                                                <TableCell>{c.subcategory}</TableCell>
                                                <TableCell>
                                                    <Badge variant={c.status === "completed" ? "default" : c.status === "pending" ? "secondary" : "outline"} className={c.status === "completed" ? "bg-manzhil-teal/20 text-manzhil-dark" : ""}>
                                                        {c.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-600">{formatDateTime(c.created_at)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {complaints.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-gray-500 py-8">No complaints for this unit</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile */}
                            <div className="block md:hidden p-4 space-y-3">
                                {complaints.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">No complaints</div>
                                ) : (
                                    complaints.map((c) => (
                                        <Card key={c.id} className="border border-gray-200 shadow-sm">
                                            <CardContent className="p-4 space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{c.subcategory}</p>
                                                        <p className="text-xs text-gray-500">{c.profiles?.name} • {c.category}</p>
                                                    </div>
                                                    <Badge variant={c.status === "completed" ? "default" : "secondary"}>{c.status}</Badge>
                                                </div>
                                                {c.description && <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>}
                                                <p className="text-xs text-gray-400">{formatDateTime(c.created_at)}</p>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== STAFF TAB ==================== */}
                <TabsContent value="staff">
                    <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                        <CardHeader className="bg-white">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-manzhil-teal" />
                                    <span>Staff Members</span>
                                </div>
                                <Badge variant="outline" className="text-lg px-4 py-2">
                                    {staff.length} Total
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {staff.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Users className="h-16 w-16 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Staff Members</h3>
                                    <p className="text-gray-500 max-w-md">
                                        No staff members registered for this unit. Staff can be added via WhatsApp.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                            <TableHead>Name</TableHead>
                                            <TableHead>CNIC</TableHead>
                                            <TableHead>Phone Number</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Registered On</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {staff.map((member) => (
                                            <TableRow key={member.id} className="hover:bg-manzhil-teal/5 transition-colors">
                                                <TableCell className="font-medium text-gray-900">{member.name}</TableCell>
                                                <TableCell className="font-mono text-gray-600">{member.cnic}</TableCell>
                                                <TableCell className="text-gray-600">{member.phone_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-manzhil-teal/10 text-manzhil-dark border-manzhil-teal/30">
                                                        {member.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {new Date(member.created_at).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ==================== ACTIVITY TAB ==================== */}
                <TabsContent value="activity">
                    <div className="space-y-6">
                        {/* Bookings */}
                        <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                            <CardHeader className="bg-white">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Calendar className="h-5 w-5 text-manzhil-teal" />
                                    Bookings
                                    <Badge variant="outline">{bookings.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                            <TableHead>Date</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Payment</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookings.slice(0, 10).map((b) => (
                                            <TableRow key={b.id} className="hover:bg-manzhil-teal/5">
                                                <TableCell>{formatDateForDisplay(b.booking_date)}</TableCell>
                                                <TableCell>{formatTime(b.start_time)} - {formatTime(b.end_time)}</TableCell>
                                                <TableCell>Rs. {Number(b.booking_charges).toLocaleString()}</TableCell>
                                                <TableCell><Badge variant={b.payment_status === "paid" ? "default" : "secondary"}>{b.payment_status}</Badge></TableCell>
                                                <TableCell><Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>{b.status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => downloadBookingInvoice(b)}
                                                        disabled={downloadingBookingId === b.id}
                                                        className="text-gray-600 hover:bg-gray-50"
                                                        title="Download invoice"
                                                    >
                                                        {downloadingBookingId === b.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Download className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {bookings.length === 0 && (
                                            <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No bookings</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Visitors */}
                        <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                            <CardHeader className="bg-white">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Ticket className="h-5 w-5 text-manzhil-teal" />
                                    Recent Visitors
                                    <Badge variant="outline">{visitors.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                            <TableHead>Visitor</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visitors.slice(0, 10).map((v) => (
                                            <TableRow key={v.id} className="hover:bg-manzhil-teal/5">
                                                <TableCell className="font-medium">{v.visitor_name || "—"}</TableCell>
                                                <TableCell>{formatDateForDisplay(v.visit_date)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={v.status === "arrived" ? "default" : v.status === "cancelled" ? "destructive" : "secondary"}>
                                                        {v.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {visitors.length === 0 && (
                                            <TableRow><TableCell colSpan={3} className="text-center text-gray-500 py-8">No visitors</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Parcels */}
                        <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
                            <CardHeader className="bg-white">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Package className="h-5 w-5 text-manzhil-teal" />
                                    Recent Parcels
                                    <Badge variant="outline">{parcels.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                                            <TableHead>Description</TableHead>
                                            <TableHead>Courier</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parcels.slice(0, 10).map((p) => (
                                            <TableRow key={p.id} className="hover:bg-manzhil-teal/5">
                                                <TableCell className="font-medium">{p.description || "Package"}</TableCell>
                                                <TableCell>{p.courier_name || "—"}</TableCell>
                                                <TableCell>
                                                    <Badge variant={p.status === "collected" ? "default" : p.status === "returned" ? "destructive" : "secondary"}>
                                                        {p.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-600">{formatDateTime(p.created_at)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {parcels.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-8">No parcels</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
