/**
 * @module time-slots
 * Generates bookable time slots from hall booking settings,
 * marking slots as unavailable when they conflict with confirmed bookings.
 */

import type { BookingSettings, TimeSlot, Booking } from "@/lib/supabase"

/**
 * Generates an array of time slots based on booking settings, checking availability.
 * @param settings - Hall booking settings (start/end time, slot duration)
 * @param existingBookings - Array of existing bookings to check for conflicts
 * @returns Array of TimeSlot objects with availability flags and display text
 */
export function generateTimeSlots(settings: BookingSettings, existingBookings: Booking[] = []): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startTime = parseTime(settings.start_time)
  const endTime = parseTime(settings.end_time)
  const duration = settings.slot_duration_minutes

  let currentTime = startTime
  let slotNumber = 1

  while (currentTime < endTime) {
    const slotEndTime = currentTime + duration * 60000 // Convert minutes to milliseconds

    if (slotEndTime <= endTime) {
      const startTimeStr = formatTime(currentTime)
      const endTimeStr = formatTime(slotEndTime)

      // Check if this slot is already booked
      const isBooked = existingBookings.some(
        (booking) => booking.start_time === startTimeStr && booking.status === "confirmed",
      )

      slots.push({
        start_time: startTimeStr,
        end_time: endTimeStr,
        is_available: !isBooked,
        display_text: `${slotNumber}. ${formatTimeDisplay(currentTime)} - ${formatTimeDisplay(slotEndTime)}`,
      })

      slotNumber++
    }

    currentTime = slotEndTime
  }

  return slots
}

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(":").map(Number)
  return hours * 60 * 60 * 1000 + minutes * 60 * 1000 // Convert to milliseconds from midnight
}

function formatTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (60 * 60 * 1000))
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000))
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`
}

function formatTimeDisplay(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (60 * 60 * 1000))
  const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000))

  if (hours === 0) {
    return `12:${minutes.toString().padStart(2, "0")} AM`
  } else if (hours < 12) {
    return `${hours}:${minutes.toString().padStart(2, "0")} AM`
  } else if (hours === 12) {
    return `12:${minutes.toString().padStart(2, "0")} PM`
  } else {
    return `${hours - 12}:${minutes.toString().padStart(2, "0")} PM`
  }
}
