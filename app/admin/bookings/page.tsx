"use client"

import { useAdmin } from "../layout"
import { Card, CardContent } from "@/components/ui/card"
import { BookingsTable } from "@/components/admin/bookings-table"
import {
    Calendar,
    CreditCard,
    Clock,
    DollarSign,
} from "lucide-react"

export default function BookingsPage() {
    const { bookings, loading, instanceSettings } = useAdmin()
    const currencySymbol = instanceSettings?.currencySymbol ?? "Rs."

    // Calculate stats
    const totalBookings = bookings.length

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const bookingsThisMonth = bookings.filter(b => {
        if (!b.created_at) return false
        const created = new Date(b.created_at)
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear
    }).length

    // Pending payments
    const pendingPayments = bookings.filter(b =>
        b.payment_status === "pending" || b.payment_status === "unpaid"
    ).length

    // Today's bookings (by booking_date, not created_at)
    const today = now.toISOString().split('T')[0]
    const todayBookings = bookings.filter(b => b.booking_date === today).length

    // Revenue this month (only paid bookings)
    const revenueThisMonth = bookings
        .filter(b => {
            if (!b.created_at || b.payment_status !== "paid") return false
            const created = new Date(b.created_at)
            return created.getMonth() === currentMonth && created.getFullYear() === currentYear
        })
        .reduce((sum, b) => sum + (b.booking_charges || 0), 0)

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-manzhil-teal" />
                    Community Hall Booking Management
                </h1>
                <p className="text-gray-500 text-sm">Manage hall bookings and reservations</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Bookings */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Total Bookings</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{totalBookings}</p>
                        <p className="text-xs text-white/80">
                            +{bookingsThisMonth} this month
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Payments */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Pending Payments</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{pendingPayments}</p>
                        <p className="text-xs text-white/80">
                            Awaiting payment confirmation
                        </p>
                    </CardContent>
                </Card>

                {/* Today's Bookings */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Today's Bookings</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{todayBookings}</p>
                        <p className="text-xs text-white/80">
                            Scheduled for today
                        </p>
                    </CardContent>
                </Card>

                {/* Revenue This Month */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Revenue This Month</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{currencySymbol} {revenueThisMonth.toLocaleString()}</p>
                        <p className="text-xs text-white/80">
                            From paid bookings
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Bookings Table */}
            <BookingsTable />
        </div>
    )
}
