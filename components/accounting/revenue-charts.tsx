"use client"

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
    Cell
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FinancialSummary } from "@/lib/supabase"

interface RevenueChartProps {
    summary: FinancialSummary | null
    loading?: boolean
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

export function MonthlyRevenueChart({ summary, loading }: RevenueChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Revenue & Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded animate-pulse">
                        <span className="text-muted-foreground">Loading chart...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const data = summary?.monthlyData || []

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`
        }
        return value.toString()
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: PKR {entry.value.toLocaleString()}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Monthly Revenue & Expenses
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar
                                dataKey="bookingIncome"
                                name="Booking Income"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="maintenanceIncome"
                                name="Maintenance Income"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                dataKey="expenses"
                                name="Expenses"
                                fill="#f59e0b"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

export function RevenueBreakdownPieChart({ summary, loading }: RevenueChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded animate-pulse">
                        <span className="text-muted-foreground">Loading chart...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const data = [
        { name: 'Booking Revenue', value: summary?.bookingRevenue || 0, color: '#10b981' },
        { name: 'Maintenance Revenue', value: summary?.maintenanceRevenue || 0, color: '#3b82f6' }
    ].filter(d => d.value > 0)

    const formatCurrency = (value: number) => {
        return `PKR ${value.toLocaleString()}`
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="text-sm font-semibold">{payload[0].name}</p>
                    <p className="text-sm">{formatCurrency(payload[0].value)}</p>
                </div>
            )
        }
        return null
    }

    if (data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        No revenue data available
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    {data.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-muted-foreground">{entry.name}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
