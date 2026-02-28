import { AmenitiesManager } from "@/components/admin/amenities-manager"
import { PrayerTimesManager } from "@/components/admin/prayer-times-manager"

export default function AmenitiesSettingsPage() {
  return (
    <div className="space-y-6">
      <AmenitiesManager />
      <PrayerTimesManager />
    </div>
  )
}
