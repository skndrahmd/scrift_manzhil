"use client"

import { useAdmin } from "../layout"
import { Card, CardContent } from "@/components/ui/card"
import { ParcelsTable } from "@/components/admin/parcels-table"
import {
    Package,
    PackageCheck,
    Clock,
    Calendar,
} from "lucide-react"

export default function ParcelsPage() {
    const { parcels, loading } = useAdmin()

    // Calculate stats
    const totalParcels = parcels.length

    // Today's date for comparisons
    const today = new Date().toISOString().split('T')[0]

    // Pending parcels
    const pendingParcels = parcels.filter(p => p.status === "pending").length

    // Today's arrivals
    const todayArrivals = parcels.filter(p =>
        p.created_at.startsWith(today)
    ).length

    // Collected today
    const collectedToday = parcels.filter(p =>
        p.status === "collected" && p.collected_at?.startsWith(today)
    ).length

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                    <Package className="h-6 w-6 text-manzhil-teal" />
                    Parcel & Delivery Tracking
                </h1>
                <p className="text-gray-500 text-sm">Manage incoming parcels and notify residents</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Parcels */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Package className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Total Parcels</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{totalParcels}</p>
                        <p className="text-xs text-white/80">
                            All registered parcels
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Pickup */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Pending Pickup</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{pendingParcels}</p>
                        <p className="text-xs text-white/80">
                            Awaiting collection
                        </p>
                    </CardContent>
                </Card>

                {/* Today's Arrivals */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Today's Arrivals</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{todayArrivals}</p>
                        <p className="text-xs text-white/80">
                            Received today
                        </p>
                    </CardContent>
                </Card>

                {/* Collected Today */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PackageCheck className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Collected Today</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{collectedToday}</p>
                        <p className="text-xs text-white/80">
                            Picked up by residents
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Parcels Table */}
            <ParcelsTable />
        </div>
    )
}
