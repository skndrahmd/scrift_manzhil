import type { BookingSettings, TimeSlot, Booking } from "./supabase"

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

export function isWorkingDay(date: string, workingDays: number[] = [1, 2, 3, 4, 5]): boolean {
  const dayOfWeek = new Date(date + "T00:00:00").getDay()
  const mondayBasedDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert Sunday from 0 to 7
  return workingDays.includes(mondayBasedDay)
}

export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
]
