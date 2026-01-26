"use client"

import { useAdmin } from "../layout"
import { Card, CardContent } from "@/components/ui/card"
import { ComplaintsTable } from "@/components/admin/complaints-table"
import {
    AlertTriangle,
    Clock,
    CheckCircle,
    TrendingUp,
} from "lucide-react"

export default function ComplaintsPage() {
    const { complaints, loading } = useAdmin()

    // Calculate stats
    const totalComplaints = complaints.length

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const complaintsThisMonth = complaints.filter(c => {
        if (!c.created_at) return false
        const created = new Date(c.created_at)
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear
    }).length

    // Status counts
    const pendingComplaints = complaints.filter(c => c.status === "pending").length
    const inProgressComplaints = complaints.filter(c => c.status === "in-progress").length
    const completedComplaints = complaints.filter(c => c.status === "completed").length

    // Resolution rate (completed / total)
    const resolutionRate = totalComplaints > 0
        ? Math.round((completedComplaints / totalComplaints) * 100)
        : 0

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-manzhil-dark flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-manzhil-teal" />
                    Complaints
                </h1>
                <p className="text-gray-500 text-sm">Track and resolve resident complaints</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Complaints */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Total Complaints</p>
                        </div>
                        <p className="text-4xl font-bold text-white mb-2">{totalComplaints}</p>
                        <p className="text-xs text-white/80">
                            +{complaintsThisMonth} this month
                        </p>
                    </CardContent>
                </Card>

                {/* Pending */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Pending</p>
                        </div>
                        <p className="text-4xl font-bold text-white mb-2">{pendingComplaints}</p>
                        <p className="text-xs text-white/80">
                            Awaiting action
                        </p>
                    </CardContent>
                </Card>

                {/* In Progress */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">In Progress</p>
                        </div>
                        <p className="text-4xl font-bold text-white mb-2">{inProgressComplaints}</p>
                        <p className="text-xs text-white/80">
                            Being worked on
                        </p>
                    </CardContent>
                </Card>

                {/* Resolution Rate */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Resolution Rate</p>
                        </div>
                        <p className="text-4xl font-bold text-white mb-2">{resolutionRate}%</p>
                        <p className="text-xs text-white/80">
                            {completedComplaints} resolved
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Complaints Table */}
            <ComplaintsTable />
        </div>
    )
}
