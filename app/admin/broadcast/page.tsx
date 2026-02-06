"use client"

import { Megaphone } from "lucide-react"
import { BroadcastForm } from "@/components/admin/broadcast-form"

export default function BroadcastPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                    <Megaphone className="h-6 w-6 text-manzhil-teal" />
                    Broadcast Message
                </h1>
                <p className="text-gray-500 text-sm">
                    Send announcements to residents via WhatsApp
                </p>
            </div>

            {/* Broadcast Form */}
            <BroadcastForm />
        </div>
    )
}
