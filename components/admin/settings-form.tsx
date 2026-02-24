"use client"

import { useState } from "react"
import { useAdmin } from "@/app/admin/layout"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Save, Users, Calendar, MessageSquare, Send, Globe, CreditCard } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { StaffManagement } from "./staff-management"
import { PaymentMethodsManager } from "./payment-methods-manager"

const WEEKDAYS = [
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
    { label: "Sunday", value: 7 },
]

export function SettingsForm() {
    const { settings, fetchSettings, userRole } = useAdmin()
    const { toast } = useToast()

    const [workingDays, setWorkingDays] = useState<number[]>(settings?.working_days || [1, 2, 3, 4, 5])
    const [bookingCharges, setBookingCharges] = useState(settings?.booking_charges || 500)
    const [saving, setSaving] = useState(false)

    const toggleDay = (day: number) => {
        setWorkingDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day].sort()
        )
    }

    const saveSettings = async () => {
        if (!settings) return

        setSaving(true)
        const { error } = await supabase
            .from("booking_settings")
            .update({
                working_days: workingDays,
                booking_charges: bookingCharges,
                updated_at: new Date().toISOString(),
            })
            .eq("id", settings.id)

        if (error) {
            toast({ title: "Error", description: "Failed to save settings", variant: "destructive" })
        } else {
            toast({ title: "Success", description: "Settings saved successfully" })
            fetchSettings()
        }
        setSaving(false)
    }

    // Check if user is super admin - only super admins can see staff management
    const isSuperAdmin = userRole === "super_admin"

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-medium text-manzhil-dark flex items-center gap-2">
                    <Settings className="h-6 w-6 text-manzhil-teal" />
                    Settings
                </h1>
                <p className="text-gray-500 text-sm mt-1">Configure system settings and manage staff</p>
            </div>

            {isSuperAdmin ? (
                <Tabs defaultValue="booking" className="w-full">
                    <TabsList className="flex w-full max-w-4xl">
                        <TabsTrigger value="booking" className="flex flex-1 items-center gap-2">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Booking Settings</span>
                        </TabsTrigger>
                        <TabsTrigger value="staff" className="flex flex-1 items-center gap-2">
                            <Users className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Staff Management</span>
                        </TabsTrigger>
                        <TabsTrigger value="bot" className="flex flex-1 items-center gap-2">
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Bot Messages</span>
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="flex flex-1 items-center gap-2">
                            <Send className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">WA Templates</span>
                        </TabsTrigger>
                        <TabsTrigger value="languages" className="flex flex-1 items-center gap-2">
                            <Globe className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Languages</span>
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="flex flex-1 items-center gap-2">
                            <CreditCard className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Payments</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="booking" className="mt-6">
                        <BookingSettingsContent
                            workingDays={workingDays}
                            toggleDay={toggleDay}
                            bookingCharges={bookingCharges}
                            setBookingCharges={setBookingCharges}
                            saveSettings={saveSettings}
                            saving={saving}
                        />
                    </TabsContent>

                    <TabsContent value="staff" className="mt-6">
                        <StaffManagement />
                    </TabsContent>

                    <TabsContent value="bot" className="mt-6">
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg">WhatsApp Bot Messages</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Customize the messages your WhatsApp bot sends to residents. Edit welcome text, menus, prompts, confirmations, and error messages without touching code.
                                </p>
                                <Link href="/admin/settings/bot-messages">
                                    <Button className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Open Bot Messages Editor
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="templates" className="mt-6">
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg">WhatsApp Templates</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Manage Twilio Content Templates used for outbound notifications. View triggers, edit SIDs, test delivery, and create drafts for new templates.
                                </p>
                                <Link href="/admin/settings/whatsapp-templates">
                                    <Button className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                                        <Send className="h-4 w-4 mr-2" />
                                        Open Template Manager
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="languages" className="mt-6">
                        <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                            <CardHeader>
                                <CardTitle className="text-lg">Bot Languages</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Enable multilingual support for the WhatsApp chatbot. When any language is enabled, residents will be prompted to select their language each time they access the main menu. Maximum 5 languages.
                                </p>
                                <Link href="/admin/settings/languages">
                                    <Button className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                                        <Globe className="h-4 w-4 mr-2" />
                                        Open Language Settings
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-6">
                        <PaymentMethodsManager />
                    </TabsContent>
                </Tabs>
            ) : (
                // Non-super admin users only see booking settings (if they have settings access at all)
                <BookingSettingsContent
                    workingDays={workingDays}
                    toggleDay={toggleDay}
                    bookingCharges={bookingCharges}
                    setBookingCharges={setBookingCharges}
                    saveSettings={saveSettings}
                    saving={saving}
                />
            )}
        </div>
    )
}

// Extracted booking settings content to avoid duplication
function BookingSettingsContent({
    workingDays,
    toggleDay,
    bookingCharges,
    setBookingCharges,
    saveSettings,
    saving,
}: {
    workingDays: number[]
    toggleDay: (day: number) => void
    bookingCharges: number
    setBookingCharges: (value: number) => void
    saveSettings: () => void
    saving: boolean
}) {
    return (
        <div className="space-y-6 max-w-2xl">
            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardHeader>
                    <CardTitle className="text-lg">Working Days</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">Select the days when the community hall is available for booking</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {WEEKDAYS.map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`day-${day.value}`}
                                    checked={workingDays.includes(day.value)}
                                    onCheckedChange={() => toggleDay(day.value)}
                                />
                                <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                                    {day.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardHeader>
                    <CardTitle className="text-lg">Booking Charges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">Set the charge per booking slot</p>
                    <div className="flex items-center gap-4">
                        <Label htmlFor="charges" className="whitespace-nowrap">Amount (Rs.)</Label>
                        <Input
                            id="charges"
                            type="number"
                            value={bookingCharges}
                            onChange={(e) => setBookingCharges(Number(e.target.value))}
                            className="max-w-[200px]"
                        />
                    </div>
                </CardContent>
            </Card>

            <Button onClick={saveSettings} disabled={saving} className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                {saving ? (
                    <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                    </>
                )}
            </Button>
        </div>
    )
}

export default SettingsForm
