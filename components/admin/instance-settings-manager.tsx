"use client"

import { useState, useEffect, useMemo } from "react"
import { useAdmin } from "@/app/admin/layout"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Search, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function InstanceSettingsManager() {
    const { instanceSettings, fetchInstanceSettings } = useAdmin()
    const { toast } = useToast()

    const [timezone, setTimezone] = useState(instanceSettings?.timezone ?? "Asia/Karachi")
    const [currencyCode, setCurrencyCode] = useState(instanceSettings?.currencyCode ?? "PKR")
    const [currencySymbol, setCurrencySymbol] = useState(instanceSettings?.currencySymbol ?? "Rs.")
    const [saving, setSaving] = useState(false)
    const [tzOpen, setTzOpen] = useState(false)
    const [locked, setLocked] = useState(false)

    useEffect(() => {
        async function checkLock() {
            const [{ count: paymentsCount }, { count: bookingsCount }] = await Promise.all([
                supabase.from("maintenance_payments").select("id", { count: "exact", head: true }),
                supabase.from("bookings").select("id", { count: "exact", head: true }),
            ])
            setLocked((paymentsCount ?? 0) > 0 || (bookingsCount ?? 0) > 0)
        }
        checkLock()
    }, [])

    const timezones = useMemo(() => {
        try {
            return Intl.supportedValuesOf("timeZone")
        } catch {
            return ["Asia/Karachi", "Asia/Riyadh", "Asia/Dubai", "America/New_York", "Europe/London", "UTC"]
        }
    }, [])

    const previewAmount = 12000
    const previewFormatted = `${currencySymbol} ${new Intl.NumberFormat("en").format(previewAmount)}`

    const previewTime = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
    })

    const handleSave = async () => {
        if (!currencyCode.trim() || !currencySymbol.trim()) {
            toast({ title: "Error", description: "Currency code and symbol are required", variant: "destructive" })
            return
        }

        if (!/^[A-Z]{3}$/.test(currencyCode.trim())) {
            toast({ title: "Error", description: "Currency code must be exactly 3 uppercase letters (e.g., PKR, USD, EUR)", variant: "destructive" })
            return
        }

        if (currencySymbol.trim().length < 1 || currencySymbol.trim().length > 5) {
            toast({ title: "Error", description: "Currency symbol must be 5 characters or less", variant: "destructive" })
            return
        }

        setSaving(true)
        try {
            const res = await fetch("/api/instance-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    timezone,
                    currency_code: currencyCode.trim().toUpperCase(),
                    currency_symbol: currencySymbol.trim(),
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to save")
            }

            toast({ title: "Success", description: "Regional settings saved successfully" })
            await fetchInstanceSettings()
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {locked && (
                <Alert className="border-amber-200 bg-amber-50">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                        Regional settings are locked because payment records exist in the system. These settings can only be configured before any payments are recorded.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardHeader>
                    <CardTitle className="text-lg">Timezone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Set the IANA timezone for this instance. All dates and times across the system will use this timezone.
                    </p>
                    <Popover open={tzOpen} onOpenChange={locked ? undefined : setTzOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={tzOpen}
                                disabled={locked}
                                className="w-full justify-between font-normal"
                            >
                                {timezone}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search timezone..." />
                                <CommandList>
                                    <CommandEmpty>No timezone found.</CommandEmpty>
                                    <CommandGroup className="max-h-64 overflow-y-auto">
                                        {timezones.map((tz) => (
                                            <CommandItem
                                                key={tz}
                                                value={tz}
                                                onSelect={() => {
                                                    setTimezone(tz)
                                                    setTzOpen(false)
                                                }}
                                            >
                                                {tz}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                        Current time in selected timezone: <strong>{previewTime}</strong>
                    </p>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
                <CardHeader>
                    <CardTitle className="text-lg">Currency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Set the currency code and symbol used throughout the system for displaying amounts.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="currency-code">Currency Code (ISO 4217)</Label>
                            <Input
                                id="currency-code"
                                value={currencyCode}
                                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().slice(0, 3))}
                                placeholder="PKR"
                                maxLength={3}
                                disabled={locked}
                                className="uppercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency-symbol">Currency Symbol</Label>
                            <Input
                                id="currency-symbol"
                                value={currencySymbol}
                                onChange={(e) => setCurrencySymbol(e.target.value.slice(0, 5))}
                                placeholder="Rs."
                                maxLength={5}
                                disabled={locked}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Preview: <strong>{previewFormatted}</strong>
                    </p>
                </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving || locked} className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal hover:shadow-lg hover:shadow-manzhil-teal/30 transition-all">
                {saving ? (
                    <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Regional Settings
                    </>
                )}
            </Button>
        </div>
    )
}
