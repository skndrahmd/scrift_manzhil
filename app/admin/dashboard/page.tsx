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
    const recentBookings = [...bookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3)
    const recentComplaints = [...complaints].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3)

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
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className={`text-xs ${booking.payment_status === 'paid' ? 'bg-manzhil-teal/20 text-manzhil-dark' : 'bg-amber-100 text-amber-700'}`}
                                            >
                                                {booking.payment_status === 'paid' ? (
                                                    <><DollarSign className="w-3 h-3 mr-1" />Paid</>
                                                ) : (
                                                    <><Clock className="w-3 h-3 mr-1" />Unpaid</>
                                                )}
                                            </Badge>
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Maintenance Payment Summary */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-manzhil-teal" />
                        Maintenance Payment Summary
                    </CardTitle>
                    <Link href="/admin/residents">
                        <Button variant="ghost" size="sm" className="text-manzhil-teal hover:text-manzhil-dark hover:bg-manzhil-teal/10">
                            View All Residents
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stats Overview */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-manzhil-teal/10 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-manzhil-teal/20 flex items-center justify-center">
                                        <CheckCircle className="h-5 w-5 text-manzhil-teal" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold text-manzhil-dark">{activeResidents - unpaidMaintenance}</p>
                                        <p className="text-sm text-gray-500">Paid</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold text-amber-700">{unpaidMaintenance}</p>
                                        <p className="text-sm text-gray-500">Unpaid</p>
                                    </div>
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Collection Rate</span>
                                    <span className="font-medium text-manzhil-dark">
                                        {Math.round(((activeResidents - unpaidMaintenance) / activeResidents) * 100) || 0}%
                                    </span>
                                </div>
                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-manzhil-teal to-manzhil-dark rounded-full transition-all duration-500"
                                        style={{ width: `${Math.round(((activeResidents - unpaidMaintenance) / activeResidents) * 100) || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Unpaid Residents List */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-700">Residents with Unpaid Maintenance</p>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                    {unpaidMaintenance} pending
                                </Badge>
                            </div>
                            {unpaidMaintenance === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-16 w-16 rounded-full bg-manzhil-teal/10 flex items-center justify-center mb-4">
                                        <CheckCircle className="h-8 w-8 text-manzhil-teal" />
                                    </div>
                                    <p className="text-gray-500 font-medium">All maintenance payments collected!</p>
                                    <p className="text-sm text-gray-400">Great job keeping up with collections</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                                    {profiles
                                        .filter(p => !p.maintenance_paid && p.is_active)
                                        .slice(0, 10)
                                        .map(resident => (
                                            <Link key={resident.id} href={`/admin/residents/${resident.id}`}>
                                                <div className="flex items-center gap-3 p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer">
                                                    <div className="h-8 w-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-medium text-sm">
                                                        {resident.name?.charAt(0)?.toUpperCase() || 'R'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-gray-900 truncate">{resident.name}</p>
                                                        <p className="text-xs text-gray-500">Apt {resident.apartment_number}</p>
                                                    </div>
                                                    <ArrowRight className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                                </div>
                                            </Link>
                                        ))
                                    }
                                </div>
                            )}
                            {unpaidMaintenance > 10 && (
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    +{unpaidMaintenance - 10} more residents with unpaid maintenance
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
