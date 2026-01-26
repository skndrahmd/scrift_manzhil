"use client"

import { useState, useEffect, createContext, useContext, useCallback, Suspense } from "react"
import { AdminSidebar } from "@/components/admin/sidebar"
import { UserMenu } from "@/components/user-menu"
import { RefreshCw, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
    supabase,
    type Booking,
    type Complaint,
    type Profile,
    type Feedback,
    type BookingSettings,
} from "@/lib/supabase"

// Admin context for shared state across all admin pages
interface AdminContextType {
    // Data
    bookings: Booking[]
    complaints: Complaint[]
    profiles: Profile[]
    feedback: Feedback[]
    settings: BookingSettings | null

    // Loading states
    loading: boolean
    refreshing: boolean

    // Badge counts
    newBookingsCount: number
    newComplaintsCount: number
    newFeedbackCount: number

    // Actions
    refreshData: () => Promise<void>
    fetchBookings: () => Promise<void>
    fetchComplaints: () => Promise<void>
    fetchProfiles: () => Promise<void>
    fetchFeedback: () => Promise<void>
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
    const [feedback, setFeedback] = useState<Feedback[]>([])
    const [settings, setSettings] = useState<BookingSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [lastViewedBookings, setLastViewedBookings] = useState<number>(Date.now())
    const [lastViewedComplaints, setLastViewedComplaints] = useState<number>(Date.now())
    const [lastViewedFeedback, setLastViewedFeedback] = useState<number>(Date.now())

    const { toast } = useToast()

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
    const newBookingsCount = bookings.filter(b => isNewBooking(b.created_at)).length
    const newComplaintsCount = complaints.filter(c => isNewComplaint(c.created_at)).length
    const newFeedbackCount = feedback.filter(f => isNewFeedbackItem(f.created_at)).length

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

    const refreshData = async () => {
        setRefreshing(true)
        await Promise.all([fetchBookings(), fetchComplaints(), fetchProfiles(), fetchFeedback(), fetchSettings()])
        setRefreshing(false)
        toast({
            title: "Data Refreshed",
            description: "All data has been updated successfully",
        })
    }

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true)
            await Promise.all([fetchBookings(), fetchComplaints(), fetchProfiles(), fetchFeedback(), fetchSettings()])
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
            })
            .subscribe()

        const feedbackChannel = supabase
            .channel('feedback-admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
                fetchFeedback()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(bookingsChannel)
            supabase.removeChannel(complaintsChannel)
            supabase.removeChannel(profilesChannel)
            supabase.removeChannel(feedbackChannel)
        }
    }, [])

    const contextValue: AdminContextType = {
        bookings,
        complaints,
        profiles,
        feedback,
        settings,
        loading,
        refreshing,
        newBookingsCount,
        newComplaintsCount,
        newFeedbackCount,
        refreshData,
        fetchBookings,
        fetchComplaints,
        fetchProfiles,
        fetchFeedback,
        fetchSettings,
        setLastViewedBookings,
        setLastViewedComplaints,
        setLastViewedFeedback,
    }

    // Always render sidebar layout for all admin pages
    return (
        <AdminContext.Provider value={contextValue}>
            <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-manzhil-teal/5">
                {/* Sidebar */}
                <AdminSidebar
                    newBookingsCount={newBookingsCount}
                    newComplaintsCount={newComplaintsCount}
                    newFeedbackCount={newFeedbackCount}
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
                            <UserMenu />
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto p-4 lg:p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-manzhil-teal"></div>
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
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </Suspense>
    )
}
