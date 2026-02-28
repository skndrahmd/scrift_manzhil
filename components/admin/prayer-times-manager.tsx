"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Moon, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PrayerTime {
  id: string
  prayer_name: string
  prayer_time: string | null
  sort_order: number
}

interface PrayerTimesSettings {
  is_enabled: boolean
}

// Generate time options for select (15-minute intervals from 4:00 AM to 11:45 PM)
const TIME_OPTIONS = Array.from({ length: 80 }, (_, i) => {
  const hours = Math.floor(i / 4) + 4 // Start from 4 AM
  const minutes = (i % 4) * 15
  const hour12 = hours % 12 || 12
  const ampm = hours < 12 || hours >= 24 ? "AM" : "PM"
  return {
    value: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    label: `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`,
  }
})

// Prayer emoji mapping
const PRAYER_EMOJIS: Record<string, string> = {
  Fajr: "🌅",
  Zuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌇",
  Isha: "🌙",
}

export function PrayerTimesManager() {
  const { toast } = useToast()
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([])
  const [settings, setSettings] = useState<PrayerTimesSettings>({ is_enabled: false })
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingToggle, setSavingToggle] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/prayer-times")
      if (!res.ok) throw new Error("Failed to fetch prayer times")
      const data = await res.json()
      setPrayerTimes(data.prayerTimes || [])
      setSettings(data.settings || { is_enabled: false })
    } catch {
      toast({
        title: "Error",
        description: "Failed to load prayer times",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleEnabled = async (enabled: boolean) => {
    setSavingToggle(true)
    try {
      const res = await fetch("/api/prayer-times", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled }),
      })

      if (!res.ok) throw new Error("Failed to update settings")

      setSettings({ is_enabled: enabled })
      toast({
        title: "Success",
        description: enabled ? "Prayer Times enabled" : "Prayer Times disabled",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setSavingToggle(false)
    }
  }

  const handleTimeChange = async (prayerId: string, time: string) => {
    setSavingId(prayerId)
    try {
      const res = await fetch("/api/prayer-times", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: prayerId, prayer_time: time }),
      })

      if (!res.ok) throw new Error("Failed to update prayer time")

      // Update local state
      setPrayerTimes((prev) =>
        prev.map((p) => (p.id === prayerId ? { ...p, prayer_time: time } : p))
      )

      toast({
        title: "Success",
        description: "Prayer time updated",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to update prayer time",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  const formatTime = (time: string | null): string => {
    if (!time) return "Not set"
    const option = TIME_OPTIONS.find((o) => o.value === time.substring(0, 5))
    return option ? option.label : time
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-manzhil-teal" />
      </div>
    )
  }

  return (
    <Card className="border-0 shadow-lg shadow-manzhil-teal/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-manzhil-dark flex items-center gap-2">
            <Moon className="h-5 w-5 text-manzhil-teal" />
            Prayer Times
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="prayer-times-toggle" className="text-sm text-gray-500">
              {settings.is_enabled ? "Enabled" : "Disabled"}
            </Label>
            {savingToggle ? (
              <Loader2 className="h-4 w-4 animate-spin text-manzhil-teal" />
            ) : (
              <Switch
                id="prayer-times-toggle"
                checked={settings.is_enabled}
                onCheckedChange={handleToggleEnabled}
              />
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Set prayer times for residents. Toggle to show/hide in the Amenities menu.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {prayerTimes.map((prayer) => (
            <div
              key={prayer.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {PRAYER_EMOJIS[prayer.prayer_name] || "🕌"}
                </span>
                <span className="font-medium text-manzhil-dark">
                  {prayer.prayer_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {savingId === prayer.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-manzhil-teal" />
                ) : null}
                <Select
                  value={prayer.prayer_time?.substring(0, 5) || ""}
                  onValueChange={(v) => handleTimeChange(prayer.id, v)}
                  disabled={!settings.is_enabled}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Set time">
                      {prayer.prayer_time ? formatTime(prayer.prayer_time) : "Set time"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
        {!settings.is_enabled && (
          <p className="text-sm text-amber-600 mt-4">
            ⚠️ Prayer Times are currently disabled. Enable the toggle to show them in the Amenities menu.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
