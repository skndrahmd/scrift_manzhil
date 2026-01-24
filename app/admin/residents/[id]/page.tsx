"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Profile, type MaintenancePayment, type Booking, type Complaint, type Staff } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, CheckCircle, XCircle, Loader2, Calendar, MessageSquare, Filter, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDateForDisplay } from "@/lib/time-utils"

function formatMonth(year: number, month: number) {
  const date = new Date(year, month - 1, 1)
  return date.toLocaleString("en-US", { month: "long", year: "numeric" })
}

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
  const [payments, setPayments] = useState<MaintenancePayment[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all")
  const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
  const [complaintsPeriod, setComplaintsPeriod] = useState<Period>("all")

  useEffect(() => {
    void load()
  }, [params.id])

  async function load() {
    setLoading(true)
    const { data: p } = await supabase.from("profiles").select("*").eq("id", params.id).single()
    setProfile((p as Profile) || null)

    if (p) {
      await ensureMaintenanceFromCreation(params.id, p.maintenance_charges ?? 0, p.created_at)
    }

    const { data: pays } = await supabase
      .from("maintenance_payments")
      .select("*")
      .eq("profile_id", params.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
    setPayments((pays as MaintenancePayment[]) || [])

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

    const { data: staffData } = await supabase
      .from("staff")
      .select("*")
      .eq("profile_id", params.id)
      .order("created_at", { ascending: false })
    setStaff((staffData as Staff[]) || [])

    setLoading(false)
  }

  async function ensureMaintenanceFromCreation(profileId: string, amount: number, createdAt: string) {
    const createdDate = new Date(createdAt)
    const now = new Date()

    const items: { year: number; month: number }[] = []
    const currentDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), 1)

    while (currentDate <= now) {
      items.push({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 })
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    const { data: existing } = await supabase
      .from("maintenance_payments")
      .select("year, month")
      .eq("profile_id", profileId)
      .in("year", Array.from(new Set(items.map((x) => x.year))))

    const key = new Set((existing || []).map((e: any) => `${e.year}-${e.month}`))

    const upserts = items
      .filter((i) => !key.has(`${i.year}-${i.month}`))
      .map((i) => ({
        profile_id: profileId,
        year: i.year,
        month: i.month,
        amount,
        status: "unpaid",
      }))

    if (upserts.length > 0) {
      await supabase.from("maintenance_payments").insert(upserts)
    }
  }

  async function markPaid(row: MaintenancePayment) {
    try {
      const response = await fetch("/api/maintenance/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: row.id, isPaid: true }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to update payment status")
      }

      toast({ title: "Updated", description: "Marked as paid and resident notified" })
      await load()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update payment", variant: "destructive" })
    }
  }

  async function markUnpaid(row: MaintenancePayment) {
    try {
      const response = await fetch("/api/maintenance/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: row.id, isPaid: false }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to update payment status")
      }

      toast({ title: "Updated", description: "Marked as unpaid" })
      await load()
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update payment", variant: "destructive" })
    }
  }

  const filteredPayments = useMemo(() => {
    if (filter === "all") return payments
    return payments.filter((p) => p.status === filter)
  }, [payments, filter])

  const bookingsDisplay = useMemo(
    () => filterByPeriod(bookings, bookingsPeriod, (b) => b.booking_date),
    [bookings, bookingsPeriod],
  )
  const complaintsDisplay = useMemo(
    () => filterByPeriod(complaints, complaintsPeriod, (c) => c.created_at),
    [complaints, complaintsPeriod],
  )

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Please wait
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div />
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl sm:text-2xl">
              {profile?.name} — {profile?.apartment_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="text-sm text-gray-600 space-y-1">
              <p>Phone: {profile?.phone_number || "N/A"}</p>
              <p>Monthly Maintenance: Rs. {profile?.maintenance_charges?.toLocaleString() ?? "0"}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="maintenance" className="space-y-6">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <TabsList className="inline-flex w-full min-w-max bg-white rounded-xl shadow-sm border border-gray-200 p-1">
              <TabsTrigger 
                value="maintenance" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap"
              >
                Maintenance
              </TabsTrigger>
              <TabsTrigger 
                value="bookings" 
                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap"
              >
                Booking History
              </TabsTrigger>
              <TabsTrigger
                value="complaints"
                className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap"
              >
                Complaints History
              </TabsTrigger>
              <TabsTrigger 
                value="staff" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm px-2 sm:px-4 py-2 whitespace-nowrap"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Staff Members</span>
                <span className="inline xs:hidden">Staff</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="maintenance">
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-white">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-lg sm:text-xl">Maintenance Payments</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 hidden sm:inline">Filter:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={filter === "all" ? "default" : "outline"}
                        onClick={() => setFilter("all")}
                        className="flex-1 sm:flex-none"
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant={filter === "paid" ? "default" : "outline"}
                        onClick={() => setFilter("paid")}
                        className="flex-1 sm:flex-none"
                      >
                        Paid
                      </Button>
                      <Button
                        size="sm"
                        variant={filter === "unpaid" ? "default" : "outline"}
                        onClick={() => setFilter("unpaid")}
                        className="flex-1 sm:flex-none"
                      >
                        Unpaid
                      </Button>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead>Month</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{formatMonth(row.year, row.month)}</TableCell>
                          <TableCell>Rs. {Number(row.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === "paid" ? "default" : "secondary"}>{row.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {row.paid_date ? new Date(row.paid_date + "T00:00:00").toLocaleDateString("en-GB") : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.status === "paid" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markUnpaid(row)}
                                className="text-red-600 hover:bg-red-50 hover:border-red-200"
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Mark Unpaid
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markPaid(row)}
                                className="text-green-600 hover:bg-green-50 hover:border-green-200"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPayments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            No records
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden p-4 space-y-3">
                  {filteredPayments.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No records
                    </div>
                  ) : (
                    filteredPayments.map((row) => (
                      <Card key={row.id} className="border border-gray-200 shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-base text-gray-900">
                                {formatMonth(row.year, row.month)}
                              </h3>
                              <p className="text-sm text-gray-500 mt-0.5">Maintenance Payment</p>
                            </div>
                            <Badge variant={row.status === "paid" ? "default" : "secondary"}>
                              {row.status}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Amount:</span>
                              <span className="font-medium text-gray-900">Rs. {Number(row.amount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Paid Date:</span>
                              <span className="font-medium text-gray-900">
                                {row.paid_date ? new Date(row.paid_date + "T00:00:00").toLocaleDateString("en-GB") : "-"}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100">
                            {row.status === "paid" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markUnpaid(row)}
                                className="w-full text-red-600 hover:bg-red-50 hover:border-red-200"
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Mark as Unpaid
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markPaid(row)}
                                className="w-full text-green-600 hover:bg-green-50 hover:border-green-200"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="border-0 shadow-xl">
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
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
                      <TableRow key={row.id} className="hover:bg-gray-50/50 transition-colors">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complaints">
            <Card className="border-0 shadow-xl">
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
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
                      <TableRow key={row.id}>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-white">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span>Staff Members</span>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {staff.length} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {staff.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Staff Members</h3>
                    <p className="text-gray-500 max-w-md">
                      This resident hasn't registered any staff members yet. Staff can be added via WhatsApp.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead>Name</TableHead>
                        <TableHead>CNIC</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Registered On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((member) => (
                        <TableRow key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-medium text-gray-900">{member.name}</TableCell>
                          <TableCell className="font-mono text-gray-600">{member.cnic}</TableCell>
                          <TableCell className="text-gray-600">{member.phone_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(member.created_at).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

