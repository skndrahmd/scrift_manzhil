"use client"

import { useAdmin } from "../layout"
import { Card, CardContent } from "@/components/ui/card"
import { FeedbackList } from "@/components/admin/feedback-list"
import {
    MessageSquare,
    TrendingUp,
    Calendar,
} from "lucide-react"

export default function FeedbackPage() {
    const { feedback } = useAdmin()

    // Calculate stats
    const totalFeedback = feedback.length

    // This month's feedback
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thisMonthFeedback = feedback.filter(f => f.created_at >= monthStart).length

    // Recent feedback (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentFeedback = feedback.filter(f => f.created_at >= weekAgo).length

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-manzhil-teal" />
                    Feedback
                </h1>
                <p className="text-gray-500 text-sm">View resident feedback and suggestions</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Feedback */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MessageSquare className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Total Feedback</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{totalFeedback}</p>
                        <p className="text-xs text-white/80">
                            All received feedback
                        </p>
                    </CardContent>
                </Card>

                {/* This Month */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">This Month</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{thisMonthFeedback}</p>
                        <p className="text-xs text-white/80">
                            New feedback received
                        </p>
                    </CardContent>
                </Card>

                {/* Recent Feedback */}
                <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardContent className="p-5 relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-sm font-medium text-white/90">Last 7 Days</p>
                        </div>
                        <p className="text-4xl font-medium text-white mb-2">{recentFeedback}</p>
                        <p className="text-xs text-white/80">
                            Recent submissions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Feedback List */}
            <FeedbackList />
        </div>
    )
}
