"use client"

import { useAdmin } from "../layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import {
    Users,
    Calendar,
    AlertTriangle,
    MessageSquare,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    XCircle,
    ArrowRight,
    Plus,
    FileText,
    DollarSign,
    LayoutDashboard,
} from "lucide-react"

export default function DashboardPage() {
    const {
        bookings,
        complaints,
        profiles,
        feedback,
        loading,
    } = useAdmin()

    // Calculate stats
    const totalResidents = profiles.length
    const activeResidents = profiles.filter(p => p.is_active).length
    const pendingComplaints = complaints.filter(c => c.status === "pending").length
    const inProgressComplaints = complaints.filter(c => c.status === "in-progress").length
    const todayBookings = bookings.filter(b => {
        const today = new Date().toISOString().split('T')[0]
        return b.booking_date === today
    }).length
    const unpaidMaintenance = profiles.filter(p => !p.maintenance_paid).length
    const recentBookings = [...bookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
    const recentComplaints = complaints.slice(0, 5)

    // Get today's date in nice format
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6 text-manzhil-teal" />
                        Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm">{today}</p>
                </div>

            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Residents */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Total Residents</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{totalResidents}</p>
                        <p className="text-xs text-white/70 font-medium">
                            {activeResidents} active community members
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Complaints */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Pending Complaints</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{pendingComplaints}</p>
                        <p className="text-xs text-white/70 font-medium">
                            {inProgressComplaints} complaints in progress
                        </p>
                    </CardContent>
                </Card>

                {/* Today's Bookings */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Today's Bookings</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{todayBookings}</p>
                        <p className="text-xs text-white/70 font-medium">
                            {bookings.length} total bookings
                        </p>
                    </CardContent>
                </Card>

                {/* Unpaid Maintenance */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Unpaid Maintenance</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{unpaidMaintenance}</p>
                        <p className="text-xs text-white/70 font-medium">
                            {Math.round((unpaidMaintenance / totalResidents) * 100) || 0}% of residents pending
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Complaints */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-medium">Recent Complaints</CardTitle>
                        <Link href="/admin/complaints">
                            <Button variant="ghost" size="sm" className="text-manzhil-teal hover:text-manzhil-dark hover:bg-manzhil-teal/10">
                                View All
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentComplaints.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No complaints yet</p>
                        ) : (
                            <div className="space-y-3">
                                {recentComplaints.map(complaint => (
                                    <div
                                        key={complaint.id}
                                        className="flex items-center justify-between p-3 bg-manzhil-teal/5 hover:bg-manzhil-teal/10 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${complaint.status === 'pending' ? 'bg-amber-500' :
                                                complaint.status === 'in-progress' ? 'bg-manzhil-teal' :
                                                    complaint.status === 'completed' ? 'bg-manzhil-dark' : 'bg-gray-400'
                                                }`} />
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">
                                                    {complaint.complaint_id}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {complaint.subcategory.replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs ${complaint.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                complaint.status === 'in-progress' ? 'bg-manzhil-teal/20 text-manzhil-dark' :
                                                    'bg-manzhil-teal/30 text-manzhil-dark'
                                                }`}
                                        >
                                            {complaint.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                            {complaint.status === 'in-progress' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                            {complaint.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {complaint.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Bookings */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-medium">Recent Bookings</CardTitle>
                        <Link href="/admin/bookings">
                            <Button variant="ghost" size="sm" className="text-manzhil-teal hover:text-manzhil-dark hover:bg-manzhil-teal/10">
                                View All
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentBookings.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No bookings yet</p>
                        ) : (
                            <div className="space-y-3">
                                {recentBookings.map(booking => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between p-3 bg-manzhil-teal/5 hover:bg-manzhil-teal/10 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-manzhil-teal/20 flex items-center justify-center text-manzhil-dark">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">
                                                    {(booking as any).profiles?.name || 'Anonymous'}
                                                    <span className="text-gray-500 font-normal ml-1">
                                                        ({(booking as any).profiles?.apartment_number || 'N/A'})
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {booking.start_time.slice(0, 5)}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs capitalize ${booking.status === 'confirmed' ? 'bg-manzhil-teal/20 text-manzhil-dark' :
                                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}
                                        >
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
