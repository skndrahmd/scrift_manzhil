"use client"

import { useState } from "react"
import { Megaphone, Receipt } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BroadcastForm } from "@/components/admin/broadcast-form"
import { UtilityBillBroadcastModal } from "@/components/admin/utility-bill-broadcast-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BroadcastPage() {
    const [utilityBillOpen, setUtilityBillOpen] = useState(false)

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                    <Megaphone className="h-6 w-6 text-manzhil-teal" />
                    Broadcast
                </h1>
                <p className="text-gray-500 text-sm">
                    Send announcements or utility bills to residents via WhatsApp
                </p>
            </div>

            <Tabs defaultValue="announcements">
                <TabsList>
                    <TabsTrigger value="announcements" className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        Announcements
                    </TabsTrigger>
                    <TabsTrigger value="utility-bills" className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Utility Bills
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="announcements">
                    <BroadcastForm />
                </TabsContent>

                <TabsContent value="utility-bills">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-manzhil-teal" />
                                Send Utility Bills
                            </CardTitle>
                            <CardDescription>
                                Upload a CSV with house numbers, phone numbers, and bill image filenames.
                                Each resident receives a WhatsApp message with a link to their individual bill.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-600 space-y-1">
                                    <p className="font-medium text-gray-800">CSV Format</p>
                                    <p className="font-mono text-xs">house_no, phone_number, image_filename</p>
                                    <p className="font-mono text-xs text-gray-500">A-101, +923001234567, A-101-march.jpg</p>
                                    <p className="font-mono text-xs text-gray-500">B-202, +923009876543, B-202-march.jpg</p>
                                </div>
                                <div className="text-sm text-gray-500 space-y-1">
                                    <p>• Upload the CSV and the corresponding image files together</p>
                                    <p>• Image filenames in the CSV must exactly match the uploaded files</p>
                                    <p>• Sends count toward the daily 250-message limit</p>
                                    <p>• Make sure the <code className="text-xs bg-gray-100 px-1 rounded">utility-bills</code> Supabase storage bucket exists and is public</p>
                                </div>
                                <Button
                                    onClick={() => setUtilityBillOpen(true)}
                                    className="bg-manzhil-teal hover:bg-manzhil-teal/90"
                                >
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Upload & Send Bills
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <UtilityBillBroadcastModal
                        open={utilityBillOpen}
                        onOpenChange={setUtilityBillOpen}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
