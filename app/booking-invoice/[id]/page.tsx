"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { generateBookingInvoicePdf } from "@/lib/pdf/invoice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Calendar,
  Clock,
  User,
  MapPin,
  CreditCard,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  Home,
  Loader2,
} from "lucide-react"
import Link from "next/link"

type Booking = {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  payment_status: string
  booking_charges: number
  payment_reference?: string
  created_at: string
  profiles?: {
    name: string
    phone_number: string
    apartment_number: string
  }
}

export default function BookingInvoicePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [generating, setGenerating] = useState(false)
  const [currencySymbol, setCurrencySymbol] = useState("Rs.")
  const [timezone, setTimezone] = useState("Asia/Karachi")

  // Get snapshot parameters
  const snapshotPayment = searchParams.get("payment")
  const snapshotBooking = searchParams.get("booking")
  const snapshot = searchParams.get("snapshot") // New unified snapshot parameter
  const isSnapshot = snapshotPayment || snapshotBooking || snapshot

  useEffect(() => {
    // Fetch instance settings for currency/timezone
    supabase.from("instance_settings").select("key, value").then(({ data }) => {
      if (data) {
        for (const row of data) {
          if (row.key === "currency_symbol") setCurrencySymbol(row.value)
          if (row.key === "timezone") setTimezone(row.value)
        }
      }
    })
  }, [])

  useEffect(() => {
    if (bookingId) {
      fetchBooking()
    }
  }, [bookingId])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const fetchBooking = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .eq("id", bookingId)
      .single()

    if (error) {
      console.error("Error fetching booking:", error)
    } else {
      setBooking(data)
      if (data) {
        await generatePreview(data)
      }
    }
    setLoading(false)
  }

  const generatePreview = async (bookingData: Booking) => {
    try {
      setGenerating(true)
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
        setPdfUrl(null)
      }
      const { blob, fileName: generatedFileName } = await generateBookingInvoicePdf(bookingData)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setFileName(generatedFileName)
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!pdfUrl) return
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = fileName || `booking-invoice-${booking?.id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getStatusDisplay = () => {
    if (isSnapshot) {
      // Handle unified snapshot parameter
      if (snapshot) {
        if (snapshot === "cancelled") {
          return {
            payment: "cancelled",
            booking: "cancelled",
          }
        }
        if (snapshot === "paid") {
          return {
            payment: "paid",
            booking: "confirmed",
          }
        }
        if (snapshot === "pending") {
          return {
            payment: "pending",
            booking: "pending",
          }
        }
      }
      return {
        payment: snapshotPayment || "pending",
        booking: snapshotBooking || "pending",
      }
    }
    return {
      payment: booking?.payment_status || "pending",
      booking: booking?.status || "pending",
    }
  }

  const statusDisplay = getStatusDisplay()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 shadow-2xl">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
            <p className="text-gray-600 mb-6">The booking invoice you're looking for doesn't exist.</p>
            {/* <Link href="/admin">
              <Button className="gap-2 bg-green-600 hover:bg-green-700">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </Link> */}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className={`bg-gradient-to-r ${statusDisplay.booking === "cancelled" ? "from-red-600 to-red-700" : "from-green-600 to-emerald-600"} p-8 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {statusDisplay.booking === "cancelled" ? <AlertCircle className="h-8 w-8" /> : <Calendar className="h-8 w-8" />}
                  <h1 className="text-3xl font-bold">{statusDisplay.booking === "cancelled" ? "Cancellation Receipt" : "Booking Invoice"}</h1>
                </div>
                <p className={`${statusDisplay.booking === "cancelled" ? "text-red-100" : "text-green-100"} text-lg`}>Community Hall Reservation</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-100 mb-1">Invoice ID</div>
                <div className="text-xl font-mono font-bold">{booking.id.slice(0, 8).toUpperCase()}</div>
              </div>
            </div>
          </div>

          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-3">
                <Badge
                  variant={statusDisplay.booking === "confirmed" ? "default" : statusDisplay.booking === "cancelled" ? "destructive" : "secondary"}
                  className={`text-base px-4 py-2 ${
                    statusDisplay.booking === "confirmed"
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : statusDisplay.booking === "cancelled"
                      ? "bg-red-100 text-red-800 hover:bg-red-200"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {statusDisplay.booking === "confirmed" && <CheckCircle className="h-4 w-4 mr-2" />}
                  {statusDisplay.booking === "cancelled" && <AlertCircle className="h-4 w-4 mr-2" />}
                  Booking: {statusDisplay.booking.toUpperCase()}
                </Badge>
                <Badge
                  variant={statusDisplay.payment === "paid" ? "default" : statusDisplay.payment === "cancelled" ? "destructive" : "secondary"}
                  className={`text-base px-4 py-2 ${
                    statusDisplay.payment === "paid"
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : statusDisplay.payment === "cancelled"
                      ? "bg-red-100 text-red-800 hover:bg-red-200"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {statusDisplay.payment === "paid" && <CheckCircle className="h-4 w-4 mr-2" />}
                  {statusDisplay.payment === "cancelled" && <AlertCircle className="h-4 w-4 mr-2" />}
                  Payment: {statusDisplay.payment.toUpperCase()}
                </Badge>
              </div>

              {isSnapshot && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  Viewing snapshot from notification
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Created on {new Date(booking.created_at).toLocaleString("en-US", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: timezone
              })}
            </div>
          </CardContent>
        </Card>

        {/* Resident Information */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-green-600" />
              Resident Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Name
                </div>
                <div className="text-lg font-semibold text-gray-900">{booking.profiles?.name || "N/A"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Apartment
                </div>
                <div className="text-lg font-semibold text-gray-900">{booking.profiles?.apartment_number || "N/A"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Contact
                </div>
                <div className="text-lg font-semibold text-gray-900">{booking.profiles?.phone_number || "N/A"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-green-600" />
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="p-3 bg-green-600 rounded-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Event Date</div>
                  <div className="text-xl font-bold text-gray-900">{formatDate(booking.booking_date)}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="p-3 bg-gray-600 rounded-lg">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Start Time</div>
                    <div className="text-lg font-semibold text-gray-900">{formatTime(booking.start_time)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="p-3 bg-gray-600 rounded-lg">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">End Time</div>
                    <div className="text-lg font-semibold text-gray-900">{formatTime(booking.end_time)}</div>
                  </div>
                </div>
              </div>

              {booking.payment_reference && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="p-3 bg-blue-600 rounded-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Payment Reference</div>
                    <div className="text-lg font-semibold text-gray-900 font-mono">{booking.payment_reference}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                <span className="text-lg font-medium text-gray-700">Hall Booking Charge</span>
                <span className="text-3xl font-bold text-green-600">
                  {currencySymbol} {booking.booking_charges.toLocaleString()}
                </span>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-semibold text-gray-900">Total Amount</span>
                  <span className="text-4xl font-bold text-green-600">
                    {currencySymbol} {booking.booking_charges.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleDownload}
                disabled={!pdfUrl || generating}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white h-14 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download Invoice PDF
                  </>
                )}
              </Button>

              {/* <Link href="/admin" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full gap-2 h-14 text-lg border-2 border-gray-300 hover:bg-gray-50 bg-transparent"
                >
                  <Home className="h-5 w-5" />
                  Back to Dashboard
                </Button>
              </Link> */}
            </div>

            {pdfUrl && (
              <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">PDF generated successfully! Click the download button to save it.</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Booking Invoice PDF"
              className="w-full h-[900px]"
              aria-label="Booking invoice preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mb-3" />
                  Generating PDF preview...
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 mb-3" />
                  Unable to display the invoice preview. Please use the download button above.
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center p-6 bg-white rounded-xl border shadow-sm">
          <p className="text-gray-600">
            For any queries regarding this booking, please contact the administration office.
          </p>
          <p className="text-gray-500 text-sm mt-2">Manzhil by Scrift</p>
        </div>
      </div>
    </div>
  )
}

