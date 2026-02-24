"use client"

import { useState, useEffect, createContext, useContext, useCallback, Suspense } from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { UserMenu } from "@/components/user-menu"
import Loader from "@/components/ui/loader"
import { RefreshCw, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
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
    supabase,
    type Booking,
    type Complaint,
    type Profile,
    type Unit,
    type Feedback,
    type BookingSettings,
    type VisitorPass,
    type Parcel,
    type AdminUser,
    type PageKey,
} from "@/lib/supabase"
import { AuthProvider, useAuth } from "@/lib/auth/context"

// Admin context for shared state across all admin pages
interface AdminContextType {
    // Data
    bookings: Booking[]
    complaints: Complaint[]
    profiles: Profile[]
    units: Unit[]
    feedback: Feedback[]
    visitors: VisitorPass[]
    parcels: Parcel[]
    settings: BookingSettings | null

    // Loading states
    loading: boolean
    refreshing: boolean

    // Badge counts
    newBookingsCount: number
    newComplaintsCount: number
    newFeedbackCount: number
    newVisitorsCount: number
    newParcelsCount: number
    pendingVerificationsCount: number

    // Auth data
    adminUser: AdminUser | null
    userRole: "super_admin" | "staff" | null
    permissions: Map<PageKey, boolean>
    hasPermission: (pageKey: PageKey) => boolean

    // Actions
    refreshData: () => Promise<void>
    fetchBookings: () => Promise<void>
    fetchComplaints: () => Promise<void>
    fetchProfiles: () => Promise<void>
    fetchUnits: () => Promise<void>
    fetchFeedback: () => Promise<void>
    fetchVisitors: () => Promise<void>
    fetchParcels: () => Promise<void>
    fetchSettings: () => Promise<void>

    // Viewed timestamps
    setLastViewedBookings: (timestamp: number) => void
    setLastViewedComplaints: (timestamp: number) => void
    setLastViewedFeedback: (timestamp: number) => void
}

const AdminContext = createContext<AdminContextType | null>(null)

export function useAdmin() {
    const context = useContext(AdminContext)
    if (!context) {
        throw new Error("useAdmin must be used within AdminLayout")
    }
    return context
}

function AdminLayoutContent({
    children,
}: {
    children: React.ReactNode
}) {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [feedback, setFeedback] = useState<Feedback[]>([])
    const [visitors, setVisitors] = useState<VisitorPass[]>([])
    const [parcels, setParcels] = useState<Parcel[]>([])
    const [settings, setSettings] = useState<BookingSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0)
    const [lastViewedBookings, setLastViewedBookings] = useState<number>(Date.now())
    const [lastViewedComplaints, setLastViewedComplaints] = useState<number>(Date.now())
    const [lastViewedFeedback, setLastViewedFeedback] = useState<number>(Date.now())

    const { toast } = useToast()
    const { adminUser, role, permissions, hasPermission, isLoading: authLoading } = useAuth()

    // Helper function to check if item is new (created within last 5 minutes)
    const isNewItem = (createdAt: string) => {
        const created = new Date(createdAt).getTime()
        const now = new Date().getTime()
        const fiveMinutes = 5 * 60 * 1000
        return now - created < fiveMinutes
    }

    const isNewBooking = useCallback((createdAt: string) => {
        const created = new Date(createdAt).getTime() - (5 * 60 * 60 * 1000)
        return created > lastViewedBookings && isNewItem(createdAt)
    }, [lastViewedBookings])

    const isNewComplaint = useCallback((createdAt: string) => {
        const created = new Date(createdAt).getTime() - (5 * 60 * 60 * 1000)
        return created > lastViewedComplaints && isNewItem(createdAt)
    }, [lastViewedComplaints])

    const isNewFeedbackItem = useCallback((createdAt: string) => {
        const created = new Date(createdAt).getTime() - (5 * 60 * 60 * 1000)
        return created > lastViewedFeedback && isNewItem(createdAt)
    }, [lastViewedFeedback])

    // Calculate counts
    // Count unpaid bookings instead of just new ones
    const newBookingsCount = bookings.filter(b => b.payment_status === "pending" || b.payment_status === "unpaid").length
    // Count active complaints (pending + in-progress) instead of just new ones
    const newComplaintsCount = complaints.filter(c => c.status === "pending" || c.status === "in-progress").length
    const newFeedbackCount = feedback.filter(f => isNewFeedbackItem(f.created_at)).length
    // Count pending visitors for today or future
    const today = new Date().toISOString().split('T')[0]
    const newVisitorsCount = visitors.filter(v => v.status === "pending" && v.visit_date >= today).length
    // Count pending parcels
    const newParcelsCount = parcels.filter(p => p.status === "pending").length

    // Fetch functions
    const fetchBookings = async () => {
        const { data } = await supabase
            .from("bookings")
            .select(`*, profiles (name, phone_number, apartment_number)`)
            .order("created_at", { ascending: false })
        if (data) setBookings(data)
    }

    const fetchComplaints = async () => {
        const { data } = await supabase
            .from("complaints")
            .select(`*, profiles (name, phone_number, apartment_number)`)
            .order("created_at", { ascending: false })
        if (data) setComplaints(data)
    }

    const fetchProfiles = async () => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .order("name", { ascending: true })
        if (data) setProfiles(data)
    }

    const fetchUnits = async () => {
        const { data } = await supabase
            .from("units")
            .select("*, profiles(*)")
            .order("apartment_number", { ascending: true })
        if (data) setUnits(data)
    }

    const fetchFeedback = async () => {
        const { data } = await supabase
            .from("feedback")
            .select("*, profiles:profiles!feedback_profile_id_fkey (name, phone_number, apartment_number)")
            .order("created_at", { ascending: false })
        if (data) setFeedback(data)
    }

    const fetchSettings = async () => {
        const { data } = await supabase.from("booking_settings").select("*").single()
        if (data) setSettings(data)
    }

    const fetchVisitors = async () => {
        const { data } = await supabase
            .from("visitor_passes")
            .select(`*, profiles (name, phone_number, apartment_number)`)
            .order("visit_date", { ascending: false })
        if (data) setVisitors(data)
    }

    const fetchParcels = async () => {
        const { data } = await supabase
            .from("parcels")
            .select(`*, profiles (name, phone_number, apartment_number)`)
            .order("created_at", { ascending: false })
        if (data) setParcels(data)
    }

    const fetchPendingVerifications = async () => {
        try {
            const { count } = await supabase
                .from("payment_verifications")
                .select("id", { count: "exact", head: true })
                .eq("status", "pending")
            setPendingVerificationsCount(count || 0)
        } catch (err) {
            console.error("Error fetching pending verifications count:", err)
        }
    }

    const refreshData = async () => {
        setRefreshing(true)
        await Promise.all([fetchBookings(), fetchComplaints(), fetchProfiles(), fetchUnits(), fetchFeedback(), fetchVisitors(), fetchParcels(), fetchSettings(), fetchPendingVerifications()])
        setRefreshing(false)
        toast({
            title: "Data Refreshed",
            description: "All data has been updated successfully",
        })
    }

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true)
            await Promise.all([fetchBookings(), fetchComplaints(), fetchProfiles(), fetchUnits(), fetchFeedback(), fetchVisitors(), fetchParcels(), fetchSettings(), fetchPendingVerifications()])
            setLoading(false)
        }
        fetchAllData()

        // Set up realtime subscriptions
        const bookingsChannel = supabase
            .channel('bookings-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                fetchBookings()
            })
            .subscribe()

        const complaintsChannel = supabase
            .channel('complaints-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
                fetchComplaints()
            })
            .subscribe()

        const profilesChannel = supabase
            .channel('profiles-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchProfiles()
                fetchUnits()
            })
            .subscribe()

        const unitsChannel = supabase
            .channel('units-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => {
                fetchUnits()
            })
            .subscribe()

        const feedbackChannel = supabase
            .channel('feedback-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
                fetchFeedback()
            })
            .subscribe()

        const visitorsChannel = supabase
            .channel('visitors-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_passes' }, () => {
                fetchVisitors()
            })
            .subscribe()

        const parcelsChannel = supabase
            .channel('parcels-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, () => {
                fetchParcels()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(bookingsChannel)
            supabase.removeChannel(complaintsChannel)
            supabase.removeChannel(profilesChannel)
            supabase.removeChannel(unitsChannel)
            supabase.removeChannel(feedbackChannel)
            supabase.removeChannel(visitorsChannel)
            supabase.removeChannel(parcelsChannel)
        }
    }, [])

    const contextValue: AdminContextType = {
        bookings,
        complaints,
        profiles,
        units,
        feedback,
        visitors,
        parcels,
        settings,
        loading,
        refreshing,
        newBookingsCount,
        newComplaintsCount,
        newFeedbackCount,
        newVisitorsCount,
        newParcelsCount,
        pendingVerificationsCount,
        adminUser,
        userRole: role,
        permissions,
        hasPermission,
        refreshData,
        fetchBookings,
        fetchComplaints,
        fetchProfiles,
        fetchUnits,
        fetchFeedback,
        fetchVisitors,
        fetchParcels,
        fetchSettings,
        setLastViewedBookings,
        setLastViewedComplaints,
        setLastViewedFeedback,
    }

    // Always render sidebar layout for all admin pages
    return (
        <AdminContext.Provider value={contextValue}>
            <div className="flex h-dvh bg-gradient-to-br from-gray-50 via-white to-manzhil-teal/5">
                {/* Sidebar */}
                <AdminSidebar
                    newBookingsCount={newBookingsCount}
                    newComplaintsCount={newComplaintsCount}
                    newFeedbackCount={newFeedbackCount}
                    newVisitorsCount={newVisitorsCount}
                    newParcelsCount={newParcelsCount}
                    pendingVerificationsCount={pendingVerificationsCount}
                    userRole={role}
                    permissions={permissions}
                />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Header */}
                    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-manzhil-teal/10 flex items-center justify-between px-4 lg:px-6 shadow-sm">
                        <div className="lg:hidden w-10" />
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={refreshData}
                                disabled={refreshing}
                                className="text-manzhil-teal hover:text-manzhil-dark hover:bg-manzhil-teal/10 transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-manzhil-teal hover:text-manzhil-dark hover:bg-manzhil-teal/10 transition-colors relative"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {(newBookingsCount + newComplaintsCount + newFeedbackCount) > 0 && (
                                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-manzhil-light rounded-full animate-pulse-subtle" />
                                        )}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-manzhil-dark">
                                            <Bell className="h-5 w-5 text-manzhil-teal" />
                                            Notifications
                                        </DialogTitle>
                                        <DialogDescription>
                                            Summary of recent updates and required actions.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex flex-col gap-4 py-4">
                                        {(newBookingsCount + newComplaintsCount + newFeedbackCount) === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <p>No new notifications</p>
                                            </div>
                                        ) : (
                                            <>
                                                {newBookingsCount > 0 && (
                                                    <div className="flex items-center justify-between p-3 rounded-lg bg-manzhil-teal/5 border border-manzhil-teal/10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-manzhil-teal/10 flex items-center justify-center">
                                                                <span className="font-medium text-manzhil-teal text-xs">{newBookingsCount}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm text-manzhil-dark">Unpaid Bookings</p>
                                                                <p className="text-xs text-muted-foreground">Pending payment confirmation</p>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="outline" className="h-8 text-xs border-manzhil-teal/20 text-manzhil-teal hover:bg-manzhil-teal/5" onClick={() => window.location.href = '/admin/bookings'}>
                                                            View
                                                        </Button>
                                                    </div>
                                                )}
                                                {newComplaintsCount > 0 && (
                                                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                                                <span className="font-medium text-amber-600 text-xs">{newComplaintsCount}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm text-manzhil-dark">Active Complaints</p>
                                                                <p className="text-xs text-muted-foreground">Pending or in-progress</p>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="outline" className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => window.location.href = '/admin/complaints'}>
                                                            View
                                                        </Button>
                                                    </div>
                                                )}
                                                {newFeedbackCount > 0 && (
                                                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <span className="font-medium text-blue-600 text-xs">{newFeedbackCount}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm text-manzhil-dark">New Feedback</p>
                                                                <p className="text-xs text-muted-foreground">Recent user feedback</p>
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="outline" className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-100" onClick={() => window.location.href = '/admin/feedback'}>
                                                            View
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <DialogFooter className="sm:justify-start">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 w-full justify-center">
                                            <span>Updates reflect real-time status</span>
                                        </div>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <UserMenu />
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto p-4 lg:p-6">
                        {(loading || authLoading) ? (
                            <div className="flex items-center justify-center h-full min-h-[50vh]">
                                <Loader />
                            </div>
                        ) : (
                            <div className="animate-fade-in">{children}</div>
                        )}
                    </main>
                </div>
            </div>
        </AdminContext.Provider>
    )
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 via-white to-manzhil-teal/5">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-manzhil-teal"></div>
            </div>
        }>
            <AuthProvider>
                <AdminLayoutContent>{children}</AdminLayoutContent>
            </AuthProvider>
        </Suspense>
    )
}
