"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Profile, type Booking, type Complaint } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Loader from "@/components/ui/loader"
import { ChevronLeft, Calendar, MessageSquare, Filter, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDate as formatDateForDisplay } from "@/lib/date"

function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "confirmed":
    case "completed":
    case "paid":
    case "resolved":
      return "default"
    case "pending":
    case "unpaid":
      return "secondary"
    case "in-progress":
      return "outline"
    case "cancelled":
      return "destructive"
    default:
      return "secondary"
  }
}

export default function ResidentProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
  const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")

  useEffect(() => {
    void load()
  }, [params.id])

  async function load() {
    setLoading(true)
    const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).single()
    setProfile((p as Profile) || null)

    const { data: bs } = await supabase
      .from("bookings")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .eq("profile_id", params.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: true })
    setBookings((bs as Booking[]) || [])

    const { data: cs } = await supabase
      .from("complaints")
      .select(
        `
        *,
        profiles (name, phone_number, apartment_number)
      `,
      )
      .eq("profile_id", params.id)
      .order("created_at", { ascending: false })
    setComplaints((cs as Complaint[]) || [])

    setLoading(false)
  }

  const bookingsDisplay = useMemo(
    () => filterByPeriod(bookings, bookingsPeriod, (b) => b.booking_date),
    [bookings, bookingsPeriod],
  )
  const complaintsDisplay = useMemo(
    () => filterByPeriod(complaints, complaintsPeriod, (c) => c.created_at),
    [complaints, complaintsPeriod],
  )

  // Calculate stats
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length
  const pendingBookings = bookings.filter(b => b.payment_status === "pending").length
  const resolvedComplaints = complaints.filter(c => c.status === "completed").length
  const pendingComplaints = complaints.filter(c => c.status === "pending" || c.status === "in-progress").length

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" className="mb-4 text-manzhil-dark" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
          <CardContent className="flex items-center justify-center py-16">
            <Loader />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get initials for avatar
  const initials = profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="text-manzhil-dark hover:bg-manzhil-teal/10 -ml-2">
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back to Residents
      </Button>

      {/* Profile Header Card */}
      <Card className="border-0 shadow-xl shadow-manzhil-teal/10 overflow-hidden">
        <div className="bg-gradient-to-r from-manzhil-dark to-manzhil-teal p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl sm:text-3xl font-medium shadow-lg">
              {initials}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-white">
              <h1 className="text-2xl sm:text-3xl font-medium mb-1">{profile?.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/80 text-sm sm:text-base">
                <span className="flex items-center gap-1">
                  <span className="font-medium">Apt {profile?.apartment_number}</span>
                </span>
                <span>•</span>
                <span>{profile?.phone_number || "No phone"}</span>
                <span>•</span>
                <span>Member since {new Date(profile?.created_at || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Bookings Stats */}
        <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-white/90">Bookings</p>
              <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">{bookings.length} total</Badge>
            </div>
            <p className="text-4xl font-medium text-white mb-2">{confirmedBookings} Confirmed</p>
            <p className="text-xs text-white/70 font-medium">{pendingBookings} pending payment</p>
          </CardContent>
        </Card>

        {/* Complaints Stats */}
        <Card className="border-0 shadow-lg shadow-manzhil-teal/10 bg-[#0F766E] text-white hover:shadow-xl hover:-translate-y-0.5 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MessageSquare className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
          </div>
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-white/90">Complaints</p>
              <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">{complaints.length} total</Badge>
            </div>
            <p className="text-4xl font-medium text-white mb-2">{resolvedComplaints} Resolved</p>
            <p className="text-xs text-white/70 font-medium">{pendingComplaints} in progress</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList className="bg-white h-auto w-full md:w-fit overflow-x-auto justify-start rounded-xl shadow-lg shadow-manzhil-teal/5 border border-manzhil-teal/10 p-1.5 gap-1 scrollbar-hide">
          <TabsTrigger
            value="bookings"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0"
          >
            <Calendar className="h-4 w-4" />
            Bookings
            <span className="bg-manzhil-teal/20 text-manzhil-dark text-xs rounded-full px-2 py-0.5">{bookings.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="complaints"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-manzhil-dark data-[state=active]:to-manzhil-teal data-[state=active]:text-white rounded-lg text-sm px-4 py-2.5 transition-all flex items-center gap-2 flex-shrink-0"
          >
            <AlertTriangle className="h-4 w-4" />
            Complaints
            {pendingComplaints > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{pendingComplaints}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
            <CardHeader className="bg-white">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-lg sm:text-xl">Booking History</span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Select
                    value={bookingsPeriod}
                    onValueChange={(value) => setBookingsPeriod(value as Period)}
                  >
                    <SelectTrigger className="w-full sm:w-40 border-gray-200">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="daily">Today</SelectItem>
                      <SelectItem value="weekly">This Week</SelectItem>
                      <SelectItem value="monthly">This Month</SelectItem>
                      <SelectItem value="yearly">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent w-full sm:w-auto"
                    onClick={() => {
                      void exportToPdf({
                        title: `Booking History — ${profile?.name || ""}`,
                        periodLabel: periodLabel(bookingsPeriod),
                        columns: [
                          { header: "Customer", dataKey: "customer" },
                          { header: "Apartment", dataKey: "apartment" },
                          { header: "Date", dataKey: "date" },
                          { header: "Time Slot", dataKey: "time" },
                          { header: "Amount", dataKey: "amount" },
                          { header: "Payment", dataKey: "payment" },
                          { header: "Status", dataKey: "status" },
                          { header: "Created At", dataKey: "created" },
                        ],
                        rows: bookingsDisplay.map((b) => ({
                          customer: b.profiles?.name || profile?.name || "N/A",
                          apartment: b.profiles?.apartment_number || profile?.apartment_number || "",
                          date: formatDateForDisplay(b.booking_date),
                          time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
                          amount: `Rs. ${Number(b.booking_charges).toLocaleString()}`,
                          payment: b.payment_status,
                          status: b.status,
                          created: formatDateTime(b.created_at),
                        })),
                        fileName: `booking-history-${profile?.apartment_number || "resident"}.pdf`,
                      })
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="inline sm:hidden">PDF</span>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                      <TableHead>Customer</TableHead>
                      <TableHead>Apartment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Slot</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingsDisplay.map((row) => (
                      <TableRow key={row.id} className="hover:bg-manzhil-teal/5 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          {row.profiles?.name || profile?.name || "N/A"}
                        </TableCell>
                        <TableCell>{row.profiles?.apartment_number || profile?.apartment_number || "N/A"}</TableCell>
                        <TableCell>{formatDateForDisplay(row.booking_date)}</TableCell>
                        <TableCell>
                          {formatTime(row.start_time)} - {formatTime(row.end_time)}
                        </TableCell>
                        <TableCell>Rs. {Number(row.booking_charges).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(row.payment_status)}>{row.payment_status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {bookingsDisplay.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                          No booking records for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile */}
              <div className="md:hidden p-4 space-y-4">
                {bookingsDisplay.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No booking records for this period</p>
                ) : (
                  bookingsDisplay.map((row) => (
                    <Card key={row.id} className="border-manzhil-teal/10 shadow-sm">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">
                            {row.profiles?.name || profile?.name || "N/A"}
                          </p>
                          <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDateForDisplay(row.booking_date)} &bull; {formatTime(row.start_time)} - {formatTime(row.end_time)}
                        </p>
                        <p className="text-sm">Rs. {Number(row.booking_charges).toLocaleString()}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(row.payment_status)} className="text-xs">{row.payment_status}</Badge>
                          <span className="text-xs text-gray-400">{row.profiles?.apartment_number || profile?.apartment_number || ""}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="complaints">
          <Card className="border-0 shadow-xl shadow-manzhil-teal/5">
            <CardHeader className="bg-white">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-lg sm:text-xl">Complaints History</span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Select
                    value={complaintsPeriod}
                    onValueChange={(value) => setComplaintsPeriod(value as Period)}
                  >                      <SelectTrigger className="w-full sm:w-40 border-gray-200">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="daily">Today</SelectItem>
                      <SelectItem value="weekly">This Week</SelectItem>
                      <SelectItem value="monthly">This Month</SelectItem>
                      <SelectItem value="yearly">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent w-full sm:w-auto"
                    onClick={() => {
                      void exportToPdf({
                        title: `Complaints History — ${profile?.name || ""}`,
                        periodLabel: periodLabel(complaintsPeriod),
                        columns: [
                          { header: "Complaint ID", dataKey: "complaintId" },
                          { header: "Customer", dataKey: "customer" },
                          { header: "Apartment", dataKey: "apartment" },
                          { header: "Category", dataKey: "category" },
                          { header: "Type", dataKey: "type" },
                          { header: "Status", dataKey: "status" },
                          { header: "Created At", dataKey: "created" },
                          { header: "Description", dataKey: "description" },
                        ],
                        rows: complaintsDisplay.map((c) => ({
                          complaintId: c.complaint_id || c.id,
                          customer: c.profiles?.name || profile?.name || "N/A",
                          apartment: c.profiles?.apartment_number || profile?.apartment_number || "",
                          category: c.category,
                          type: c.subcategory,
                          status: c.status,
                          created: formatDateTime(c.created_at),
                          description: c.description || "—",
                        })),
                        fileName: `complaints-history-${profile?.apartment_number || "resident"}.pdf`,
                      })
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="inline sm:hidden">PDF</span>
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-manzhil-teal/5 to-transparent">
                    <TableHead>Complaint ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Apartment</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaintsDisplay.map((row) => (
                    <TableRow key={row.id} className="hover:bg-manzhil-teal/5 transition-colors">
                      <TableCell className="font-medium">{row.complaint_id || row.id}</TableCell>
                      <TableCell>{row.profiles?.name || profile?.name || "N/A"}</TableCell>
                      <TableCell>{row.profiles?.apartment_number || profile?.apartment_number || "N/A"}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.subcategory}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="max-w-xs">
                        {row.description ? (
                          <span className="line-clamp-3 text-gray-700">{row.description}</span>
                        ) : (
                          <span className="text-gray-400">No description</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {complaintsDisplay.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        No complaint records for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
