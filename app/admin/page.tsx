"use client"

import { useAdmin } from "./layout"
import { Card, CardContent } from "@/components/ui/card"
import { ResidentsTable } from "@/components/admin/residents-table"
import {
  Users,
  Home,
  CreditCard,
  AlertCircle,
} from "lucide-react"

export default function AdminPage() {
  const { profiles, complaints, loading } = useAdmin()

  // Calculate stats
  const totalResidents = profiles.length
  const newResidentsThisMonth = profiles.filter(p => {
    if (!p.created_at) return false
    const created = new Date(p.created_at)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length

  // Occupancy calculation (assuming max 40 apartments - adjust as needed)
  const MAX_APARTMENTS = 40
  const occupiedApartments = profiles.filter(p => p.is_active).length
  const occupancyRate = MAX_APARTMENTS > 0 ? Math.round((occupiedApartments / MAX_APARTMENTS) * 100) : 0

  // Payment compliance
  const paidUpResidents = profiles.filter(p => p.maintenance_paid).length
  const paymentComplianceRate = totalResidents > 0 ? Math.round((paidUpResidents / totalResidents) * 100) : 0
  const residentsWithDues = totalResidents - paidUpResidents

  // Active issues (residents with pending/in-progress complaints)
  const residentsWithIssues = new Set(
    complaints
      .filter(c => c.status === "pending" || c.status === "in-progress")
      .map(c => c.profile_id)
  ).size
  const pendingCount = complaints.filter(c => c.status === "pending").length
  const inProgressCount = complaints.filter(c => c.status === "in-progress").length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
          <Users className="h-6 w-6 text-manzhil-teal" />
          Residents
        </h1>
        <p className="text-gray-500 text-sm">Manage and monitor all residents</p>
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
            <p className="text-xs text-white/80">
              +{newResidentsThisMonth} new this month
            </p>
          </CardContent>
        </Card>

        {/* Payment Compliance */}
        <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-white/90">Payment Compliance</p>
            </div>
            <p className="text-4xl font-medium text-white mb-2">{paymentComplianceRate}%</p>
            <p className="text-xs text-white/80">
              {paidUpResidents} paid up / {residentsWithDues} with dues
            </p>
          </CardContent>
        </Card>

        {/* Active Issues */}
        <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-white/90">Active Issues</p>
            </div>
            <p className="text-4xl font-medium text-white mb-2">{residentsWithIssues}</p>
            <p className="text-xs text-white/80">
              {pendingCount} pending / {inProgressCount} in-progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Residents Table */}
      <ResidentsTable />
    </div>
  )
}
