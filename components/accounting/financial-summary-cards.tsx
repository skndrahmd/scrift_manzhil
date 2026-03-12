"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    PiggyBank,
    BarChart3
} from "lucide-react"
import type { FinancialSummary } from "@/lib/supabase"
import { useAdmin } from "@/app/admin/layout"

interface FinancialSummaryCardsProps {
    summary: FinancialSummary | null
    loading?: boolean
}

export function FinancialSummaryCards({ summary, loading }: FinancialSummaryCardsProps) {
    const { instanceSettings } = useAdmin()
    const currencySymbol = instanceSettings?.currencySymbol ?? "Rs."
    const formatCurrency = (amount: number) => `${currencySymbol} ${amount.toLocaleString()}`

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse border-0 shadow-lg shadow-manzhil-teal/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-gray-200 rounded" />
                            <div className="h-8 w-8 bg-gray-200 rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-20 bg-gray-200 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const cards = [
        {
            title: "Total Revenue",
            value: summary?.totalRevenue || 0,
            icon: DollarSign,
            description: "All income collected",
            trend: "up",
            color: "text-manzhil-teal",
            bgColor: "bg-manzhil-teal/20"
        },
        {
            title: "Net Income",
            value: summary?.netIncome || 0,
            icon: summary?.netIncome && summary.netIncome >= 0 ? TrendingUp : TrendingDown,
            description: "Revenue minus expenses",
            trend: summary?.netIncome && summary.netIncome >= 0 ? "up" : "down",
            color: summary?.netIncome && summary.netIncome >= 0 ? "text-manzhil-dark" : "text-red-600",
            bgColor: summary?.netIncome && summary.netIncome >= 0 ? "bg-manzhil-dark/10" : "bg-red-100"
        },
        {
            title: "Total Expenses",
            value: summary?.totalExpenses || 0,
            icon: Wallet,
            description: "All expenses recorded",
            trend: "neutral",
            color: "text-amber-600",
            bgColor: "bg-amber-100"
        },
        {
            title: "Outstanding Dues",
            value: summary?.outstandingDues || 0,
            icon: PiggyBank,
            description: `${summary?.collectionRate?.toFixed(1) || 0}% collection rate`,
            trend: "neutral",
            color: "text-manzhil-teal",
            bgColor: "bg-manzhil-teal/10"
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, index) => (
                <Card key={index} className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <card.icon className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">{card.title}</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">
                            {formatCurrency(card.value)}
                        </p>
                        <p className="text-xs text-white/80 flex items-center">
                            {card.trend === "up" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                            {card.trend === "down" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {card.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

// Revenue breakdown cards showing booking vs maintenance income
export function RevenueBreakdownCards({ summary, loading }: FinancialSummaryCardsProps) {
    const { instanceSettings } = useAdmin()
    const currencySymbol = instanceSettings?.currencySymbol ?? "Rs."
    const formatCurrency = (amount: number) => `${currencySymbol} ${amount.toLocaleString()}`

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="pt-6">
                            <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                            <div className="h-6 w-24 bg-gray-200 rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const totalRevenue = summary?.totalRevenue || 1
    const bookingPercent = ((summary?.bookingRevenue || 0) / totalRevenue * 100).toFixed(1)
    const maintenancePercent = ((summary?.maintenanceRevenue || 0) / totalRevenue * 100).toFixed(1)

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                </div>
                <CardContent className="p-5 relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/90">Booking Revenue</p>
                            <p className="text-3xl font-medium text-white mt-2">
                                {formatCurrency(summary?.bookingRevenue || 0)}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-medium text-white">{bookingPercent}%</span>
                            <p className="text-xs text-white/70">of total</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                </div>
                <CardContent className="p-5 relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/90">Maintenance Revenue</p>
                            <p className="text-3xl font-medium text-white mt-2">
                                {formatCurrency(summary?.maintenanceRevenue || 0)}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-medium text-white">{maintenancePercent}%</span>
                            <p className="text-xs text-white/70">of total</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
