"use client"

import { useState } from "react"
import { useAdmin } from "@/app/admin/layout"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const WEEKDAYS = [
    { label: "Sunday", value: 0 },
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
]

export function SettingsForm() {
    const { settings, fetchSettings } = useAdmin()
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

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-manzhil-dark flex items-center gap-2">
                    <Settings className="h-6 w-6 text-manzhil-teal" />
                    Booking Settings
                </h1>
                <p className="text-gray-500 text-sm mt-1">Configure community hall booking options</p>
            </div>

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
