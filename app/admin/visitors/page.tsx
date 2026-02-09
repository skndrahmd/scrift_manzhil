"use client"

import { useAdmin } from "../layout"
import { Card, CardContent } from "@/components/ui/card"
import { VisitorsTable } from "@/components/admin/visitors-table"
import {
    Ticket,
    UserCheck,
    Clock,
    Calendar,
} from "lucide-react"

export default function VisitorsPage() {
    const { visitors, loading } = useAdmin()

    // Calculate stats
    const totalPasses = visitors.length

    // Today's date for comparisons
    const today = new Date().toISOString().split('T')[0]

    // Pending visitors (for today or future)
    const pendingVisitors = visitors.filter(v =>
        v.status === "pending" && v.visit_date >= today
    ).length

    // Today's visitors
    const todayVisitors = visitors.filter(v => v.visit_date === today).length

    // Arrived today
    const arrivedToday = visitors.filter(v =>
        v.visit_date === today && v.status === "arrived"
    ).length

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                    <Ticket className="h-6 w-6 text-manzhil-teal" />
                    Visitor Entry Passes
                </h1>
                <p className="text-gray-500 text-sm">Manage visitor registrations and arrivals</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Passes */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Ticket className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Total Passes</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{totalPasses}</p>
                        <p className="text-xs text-white/80">
                            All registered visitors
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Visitors */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Pending Arrivals</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{pendingVisitors}</p>
                        <p className="text-xs text-white/80">
                            Expected visitors
                        </p>
                    </CardContent>
                </Card>

                {/* Today's Visitors */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Today's Visitors</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{todayVisitors}</p>
                        <p className="text-xs text-white/80">
                            Scheduled for today
                        </p>
                    </CardContent>
                </Card>

                {/* Arrived Today */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <UserCheck className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Arrived Today</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{arrivedToday}</p>
                        <p className="text-xs text-white/80">
                            Checked in visitors
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Visitors Table */}
            <VisitorsTable />
        </div>
    )
}
