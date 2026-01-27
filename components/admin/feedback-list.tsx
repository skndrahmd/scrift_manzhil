"use client"

import { useEffect } from "react"
import { useAdmin } from "@/app/admin/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Star } from "lucide-react"

export function FeedbackList() {
    const { feedback, setLastViewedFeedback } = useAdmin()

    // Mark as viewed when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            setLastViewedFeedback(Date.now())
        }, 2000)
        return () => clearTimeout(timer)
    }, [setLastViewedFeedback])

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        })
    }

    return (
        <>
            {/* Feedback Cards */}
            {feedback.length === 0 ? (
                <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                    <CardContent className="p-12 text-center">
                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No feedback yet</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {feedback.map((item) => (
                        <Card key={item.id} className="border-0 shadow-lg shadow-manzhil-teal/5 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="font-medium text-gray-900">
                                            {(item as any).profiles?.name || "Anonymous"}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {(item as any).profiles?.apartment_number || "N/A"} • {formatDateTime(item.created_at)}
                                        </p>
                                    </div>
                                    {(item as any).rating && (
                                        <Badge variant="secondary" className="flex items-center gap-1 bg-manzhil-teal/10 text-manzhil-dark">
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                            {(item as any).rating}/5
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-gray-700">{item.message}</p>
                                {(item as any).category && (
                                    <Badge variant="outline" className="mt-4 capitalize border-manzhil-teal/30 text-manzhil-dark">
                                        {(item as any).category}
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    )
}

export default FeedbackList
