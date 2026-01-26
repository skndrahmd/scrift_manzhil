"use client"

import { useMemo, useState } from "react"
import { useAdmin } from "@/app/admin/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area,
} from "recharts"
import {
    BarChart3,
    AlertTriangle,
    CheckCircle,
    Clock,
    XCircle,
    Users,
    DollarSign,
    Calendar,
    TrendingUp,
    TrendingDown,
    MessageSquare,
    Home,
    Wallet,
    Target,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react"

// Manzhil color palette for charts
const CHART_COLORS = {
    primary: '#075E54',
    secondary: '#128C7E',
    tertiary: '#25D366',
    warning: '#f59e0b',
    danger: '#ef4444',
    neutral: '#6b7280',
}

type Period = 'week' | 'month' | 'quarter' | 'year'

export function AnalyticsDashboard() {
    const { complaints, bookings, profiles, feedback } = useAdmin()
    const [period, setPeriod] = useState<Period>('month')

    // ========== KPI Calculations ==========
    const kpiData = useMemo(() => {
        const totalResidents = profiles.length
        const activeResidents = profiles.filter(p => p.is_active).length
        const occupancyRate = totalResidents > 0 ? Math.round((activeResidents / totalResidents) * 100) : 0

        const paidResidents = profiles.filter(p => p.maintenance_paid).length
        const collectionRate = totalResidents > 0 ? Math.round((paidResidents / totalResidents) * 100) : 0

        // Calculate average resolution time (completed complaints)
        const completedComplaints = complaints.filter(c => c.status === 'completed')
        let avgResolutionDays = 0
        if (completedComplaints.length > 0) {
            const totalDays = completedComplaints.reduce((sum, c) => {
                const created = new Date(c.created_at)
                const updated = new Date(c.updated_at || c.created_at)
                const days = Math.max(1, Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
                return sum + days
            }, 0)
            avgResolutionDays = Math.round((totalDays / completedComplaints.length) * 10) / 10
        }

        // Calculate booking revenue for current month
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthBookings = bookings.filter(b => {
            const bookingDate = new Date(b.booking_date)
            return bookingDate >= monthStart && b.payment_status === 'paid'
        })
        const revenueThisMonth = monthBookings.reduce((sum, b) => sum + (b.booking_charges || 0), 0)

        return {
            occupancyRate,
            collectionRate,
            avgResolutionDays,
            revenueThisMonth,
            totalResidents,
            activeResidents,
            paidResidents,
            pendingComplaints: complaints.filter(c => c.status === 'pending').length,
        }
    }, [complaints, bookings, profiles])

    // ========== Financial Analytics ==========
    const financialData = useMemo(() => {
        // Revenue breakdown
        const bookingRevenue = bookings
            .filter(b => b.payment_status === 'paid')
            .reduce((sum, b) => sum + (b.booking_charges || 0), 0)

        const maintenanceRevenue = profiles
            .filter(p => p.maintenance_paid)
            .reduce((sum, p) => sum + (p.maintenance_charges || 0), 0)

        const revenueBreakdown = [
            { name: 'Booking Revenue', value: bookingRevenue, color: CHART_COLORS.primary },
            { name: 'Maintenance Revenue', value: maintenanceRevenue, color: CHART_COLORS.secondary },
        ]

        // Collection by status
        const paid = profiles.filter(p => p.maintenance_paid).length
        const unpaid = profiles.filter(p => !p.maintenance_paid).length
        const collectionStatus = [
            { status: 'Paid', count: paid, fill: CHART_COLORS.primary },
            { status: 'Unpaid', count: unpaid, fill: CHART_COLORS.warning },
        ]

        // Outstanding dues list (top 10)
        const outstandingResidents = profiles
            .filter(p => !p.maintenance_paid && p.is_active)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(0, 10)

        return { revenueBreakdown, collectionStatus, outstandingResidents, bookingRevenue, maintenanceRevenue }
    }, [bookings, profiles])

    // ========== Complaint Analytics ==========
    const complaintData = useMemo(() => {
        // Group by status
        const byStatus: Record<string, number> = {}
        complaints.forEach(c => {
            byStatus[c.status] = (byStatus[c.status] || 0) + 1
        })

        // Group by category
        const byCategory: Record<string, number> = {}
        complaints.forEach(c => {
            byCategory[c.category] = (byCategory[c.category] || 0) + 1
        })

        // Top subcategories
        const bySubcategory: Record<string, number> = {}
        complaints.forEach(c => {
            const key = `${c.category} - ${c.subcategory}`
            bySubcategory[key] = (bySubcategory[key] || 0) + 1
        })

        const topCategories = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, count]) => ({ name, count }))

        const topSubcategories = Object.entries(bySubcategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))

        // Complaints trend (last 6 months)
        const months: string[] = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            months.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }))
        }

        const trendData = months.map((month, idx) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
            const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
            const count = complaints.filter(c => {
                const created = new Date(c.created_at)
                return created >= d && created < nextMonth
            }).length
            return { month, complaints: count }
        })

        return { byStatus, topCategories, topSubcategories, trendData }
    }, [complaints])

    // ========== Booking Analytics ==========
    const bookingData = useMemo(() => {
        // Bookings by status
        const byStatus: Record<string, number> = {}
        bookings.forEach(b => {
            byStatus[b.status] = (byStatus[b.status] || 0) + 1
        })

        // Peak hours analysis
        const byHour: Record<number, number> = {}
        bookings.forEach(b => {
            const hour = parseInt(b.start_time.split(':')[0])
            byHour[hour] = (byHour[hour] || 0) + 1
        })

        const peakHours = Object.entries(byHour)
            .map(([hour, count]) => ({
                hour: `${hour}:00`,
                bookings: count,
            }))
            .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))

        // Bookings trend (last 30 days)
        const last30Days: { date: string; count: number }[] = []
        const now = new Date()
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            const count = bookings.filter(b => b.booking_date === dateStr).length
            last30Days.push({
                date: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                count,
            })
        }

        // Future bookings revenue
        const todayStr = now.toISOString().split('T')[0]
        const futureBookings = bookings.filter(b => b.booking_date >= todayStr && b.status === 'confirmed')
        const projectedRevenue = futureBookings.reduce((sum, b) => sum + (b.booking_charges || 0), 0)

        return { byStatus, peakHours, last30Days, projectedRevenue, futureBookingsCount: futureBookings.length }
    }, [bookings])

    // ========== Resident Analytics ==========
    const residentData = useMemo(() => {
        // Tenure distribution
        const now = new Date()
        const tenure = {
            '<3 months': 0,
            '3-6 months': 0,
            '6-12 months': 0,
            '1-2 years': 0,
            '2+ years': 0,
        }

        profiles.forEach(p => {
            const created = new Date(p.created_at)
            const monthsDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth())
            if (monthsDiff < 3) tenure['<3 months']++
            else if (monthsDiff < 6) tenure['3-6 months']++
            else if (monthsDiff < 12) tenure['6-12 months']++
            else if (monthsDiff < 24) tenure['1-2 years']++
            else tenure['2+ years']++
        })

        const tenureData = Object.entries(tenure).map(([range, count]) => ({ range, count }))

        // Engagement scores (top residents by activity)
        const engagement: Record<string, { name: string; apt: string; bookings: number; complaints: number; score: number }> = {}

        profiles.forEach(p => {
            engagement[p.id] = {
                name: p.name || 'Unknown',
                apt: p.apartment_number || '',
                bookings: 0,
                complaints: 0,
                score: 0,
            }
        })

        bookings.forEach(b => {
            if (engagement[b.profile_id]) {
                engagement[b.profile_id].bookings++
            }
        })

        complaints.forEach(c => {
            if (engagement[c.profile_id]) {
                engagement[c.profile_id].complaints++
            }
        })

        const topEngaged = Object.values(engagement)
            .map(e => ({ ...e, score: e.bookings * 2 + e.complaints }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)

        // At-risk residents (unpaid + complaints)
        const atRisk = profiles
            .filter(p => !p.maintenance_paid)
            .map(p => {
                const residentComplaints = complaints.filter(c => c.profile_id === p.id).length
                return { ...p, complaintCount: residentComplaints }
            })
            .filter(p => p.complaintCount > 0)
            .sort((a, b) => b.complaintCount - a.complaintCount)
            .slice(0, 10)

        return { tenureData, topEngaged, atRisk }
    }, [profiles, bookings, complaints])

    // ========== Helper Functions ==========
    const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-manzhil-teal/20 text-manzhil-dark"
            case "in-progress": return "bg-blue-100 text-blue-700"
            case "pending": return "bg-amber-100 text-amber-700"
            case "cancelled": return "bg-red-100 text-red-700"
            default: return "bg-gray-100 text-gray-700"
        }
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-manzhil-teal/20 rounded-lg shadow-lg">
                    <p className="font-semibold text-manzhil-dark">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {typeof entry.value === 'number' && entry.name?.includes('Revenue')
                                ? formatCurrency(entry.value)
                                : entry.value}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-manzhil-dark flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-manzhil-teal" />
                        Analytics
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Data-driven insights for building management</p>
                </div>
                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                    <SelectTrigger className="w-[180px] border-manzhil-teal/30">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Occupancy Rate */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Total Residents</p>
                        </div>
                        <p className="text-4xl font-bold text-white mb-2">{kpiData.occupancyRate}%</p>
                        <p className="text-xs text-white/70 font-medium">
                            {kpiData.activeResidents} active community members
                        </p>
                    </CardContent>
                </Card>

                {/* Collection Rate */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Active Bookings</p>
                        </div>
                        <p className="text-4xl font-bold text-white mb-2">{bookings.filter(b => b.status === 'confirmed').length}</p>
                        <p className="text-xs text-white/70 font-medium">
                            Confirmed reservations
                        </p>
                    </CardContent>
                </Card>

                {/* Avg Resolution Time */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Pending Payments</p>
                        </div>
                        <p className="text-4xl font-bold text-white mb-2">{profiles.filter(p => !p.maintenance_paid).length}</p>
                        <p className="text-xs text-white/70 font-medium">
                            Maintenance payments due
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
                        <p className="text-4xl font-bold text-white mb-2">{
                            bookings.filter(b => {
                                const today = new Date().toISOString().split('T')[0]
                                return b.booking_date === today
                            }).length
                        }</p>
                        <p className="text-xs text-white/70 font-medium">
                            Confirmed for today
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabbed Analytics Sections */}
            <Tabs defaultValue="financial" className="space-y-6">

                <TabsList className="bg-white h-auto w-full md:w-fit overflow-x-auto justify-start rounded-xl shadow-lg shadow-manzhil-teal/5 border border-manzhil-teal/10 p-1.5 gap-1 scrollbar-hide">
                    <TabsTrigger
                        value="financial"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0"
                    >
                        <DollarSign className="h-4 w-4" />
                        Financial
                    </TabsTrigger>
                    <TabsTrigger
                        value="complaints"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        Complaints
                    </TabsTrigger>
                    <TabsTrigger
                        value="bookings"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0"
                    >
                        <Calendar className="h-4 w-4" />
                        Bookings
                    </TabsTrigger>
                    <TabsTrigger
                        value="residents"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0"
                    >
                        <Users className="h-4 w-4" />
                        Residents
                    </TabsTrigger>
                </TabsList>

                {/* Financial Tab */}
                <TabsContent value="financial" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Breakdown Pie Chart */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Target className="h-5 w-5 text-manzhil-teal" />
                                    Revenue Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={financialData.revenueBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            >
                                                {financialData.revenueBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-4">
                                    {financialData.revenueBreakdown.map((entry, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-sm text-gray-600">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Collection Status */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Wallet className="h-5 w-5 text-manzhil-teal" />
                                    Collection Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={financialData.collectionStatus} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="status" type="category" width={80} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                {financialData.collectionStatus.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Outstanding Dues Table */}
                    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    Outstanding Dues
                                </span>
                                <Badge className="bg-amber-100 text-amber-700">
                                    {financialData.outstandingResidents.length} residents
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {financialData.outstandingResidents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-manzhil-teal" />
                                    <p>All residents have paid!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {financialData.outstandingResidents.map((resident) => (
                                        <div key={resident.id} className="flex items-center justify-between p-3 bg-manzhil-teal/5 hover:bg-manzhil-teal/10 rounded-lg transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                                                    {resident.apartment_number}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{resident.name}</p>
                                                    <p className="text-xs text-gray-500">{resident.phone_number}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-amber-600">
                                                    {formatCurrency(resident.maintenance_charges || 0)}
                                                </p>
                                                <p className="text-xs text-gray-500">outstanding</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Complaints Tab */}
                <TabsContent value="complaints" className="space-y-6">
                    {/* Status Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(complaintData.byStatus).map(([status, count]) => (
                            <Card key={status} className="border-0 shadow-lg shadow-manzhil-teal/5">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 capitalize">{status}</p>
                                            <p className="text-2xl font-bold text-manzhil-dark">{count}</p>
                                        </div>
                                        <Badge className={getStatusColor(status)}>
                                            {status === 'completed' && <CheckCircle className="h-4 w-4" />}
                                            {status === 'in-progress' && <Clock className="h-4 w-4" />}
                                            {status === 'pending' && <AlertTriangle className="h-4 w-4" />}
                                            {status === 'cancelled' && <XCircle className="h-4 w-4" />}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Complaints Trend */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg">Complaints Trend (Last 6 Months)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={complaintData.trendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                            <YAxis />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="complaints"
                                                stroke={CHART_COLORS.primary}
                                                fill={CHART_COLORS.secondary}
                                                fillOpacity={0.3}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Categories */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg">By Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {complaintData.topCategories.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No data available</p>
                                ) : (
                                    <div className="space-y-3">
                                        {complaintData.topCategories.map(({ name, count }) => {
                                            const percentage = Math.round((count / complaints.length) * 100)
                                            return (
                                                <div key={name} className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-sm font-medium capitalize">{name}</span>
                                                            <span className="text-sm text-gray-500">{count}</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-manzhil-dark to-manzhil-teal rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Issue Types */}
                    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                        <CardHeader>
                            <CardTitle className="text-lg">Top Issue Types</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={complaintData.topSubcategories} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bookings Tab */}
                <TabsContent value="bookings" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-manzhil-teal/10 flex items-center justify-center">
                                        <Calendar className="h-6 w-6 text-manzhil-teal" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-manzhil-dark">{bookings.length}</p>
                                        <p className="text-sm text-gray-500">Total Bookings</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-manzhil-dark/10 flex items-center justify-center">
                                        <TrendingUp className="h-6 w-6 text-manzhil-dark" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-manzhil-dark">{bookingData.futureBookingsCount}</p>
                                        <p className="text-sm text-gray-500">Upcoming Bookings</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-manzhil-teal/20 flex items-center justify-center">
                                        <DollarSign className="h-6 w-6 text-manzhil-dark" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-manzhil-dark">{formatCurrency(bookingData.projectedRevenue)}</p>
                                        <p className="text-sm text-gray-500">Projected Revenue</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bookings Last 30 Days */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5 lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">Bookings (Last 30 Days)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={bookingData.last30Days}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                                            <YAxis />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="count"
                                                name="Bookings"
                                                stroke={CHART_COLORS.primary}
                                                fill={CHART_COLORS.tertiary}
                                                fillOpacity={0.4}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Peak Hours */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5 lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">Peak Booking Hours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bookingData.peakHours}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                                            <YAxis />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="bookings" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Residents Tab */}
                <TabsContent value="residents" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tenure Distribution */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-manzhil-teal" />
                                    Tenure Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={residentData.tenureData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                                            <YAxis />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* At-Risk Residents */}
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-500" />
                                        At-Risk Residents
                                    </span>
                                    <Badge className="bg-red-100 text-red-700">{residentData.atRisk.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {residentData.atRisk.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-manzhil-teal" />
                                        <p>No at-risk residents</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[240px] overflow-y-auto">
                                        {residentData.atRisk.map((resident) => (
                                            <div key={resident.id} className="flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                                                        {resident.apartment_number}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{resident.name}</p>
                                                        <p className="text-xs text-gray-500">Unpaid + {resident.complaintCount} complaints</p>
                                                    </div>
                                                </div>
                                                <Badge className="bg-red-100 text-red-700">Risk</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Most Engaged Residents */}
                    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-manzhil-teal" />
                                Most Engaged Residents
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                {residentData.topEngaged.slice(0, 5).map((resident, idx) => (
                                    <div key={idx} className="p-4 bg-manzhil-teal/5 rounded-lg text-center">
                                        <div className="h-12 w-12 rounded-full bg-manzhil-teal/20 flex items-center justify-center mx-auto mb-2 text-manzhil-dark font-bold">
                                            {resident.apt || '?'}
                                        </div>
                                        <p className="font-medium text-sm text-gray-900 truncate">{resident.name}</p>
                                        <p className="text-xs text-gray-500">{resident.bookings} bookings • {resident.complaints} tickets</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default AnalyticsDashboard
