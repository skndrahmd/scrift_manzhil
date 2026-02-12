"use client"

import { useState, useMemo, useEffect } from "react"
import { useAdmin } from "@/app/admin/layout"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Calendar,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    X,
    Eye,
    Bell,
    Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { formatDateForDisplay } from "@/lib/time-utils"
import { exportToPdf, filterByPeriod, periodLabel, type Period } from "@/lib/pdf"

export function BookingsTable() {
    const { bookings, fetchBookings, newBookingsCount, setLastViewedBookings } = useAdmin()
    const { toast } = useToast()

    // Local state
    const [searchTerm, setSearchTerm] = useState("")
    const [dateFilter, setDateFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [bookingsPeriod, setBookingsPeriod] = useState<Period>("all")
    const [currentPage, setCurrentPage] = useState(1)
    const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)
    const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)
    const [sendingBulkReminder, setSendingBulkReminder] = useState(false)

    const itemsPerPage = 10

    // Mark as viewed when component mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            setLastViewedBookings(Date.now())
        }, 2000)
        return () => clearTimeout(timer)
    }, [setLastViewedBookings])

    const formatTime = (timeString: string) => {
        const [hours, minutes] = timeString.split(":")
        const hour = Number.parseInt(hours)
        const ampm = hour >= 12 ? "PM" : "AM"
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${displayHour}:${minutes} ${ampm}`
    }

    // Filter bookings
    const filteredBookings = useMemo(() => {
        return bookings.filter((booking) => {
            const matchesSearch =
                !searchTerm ||
                booking.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                booking.profiles?.phone_number?.includes(searchTerm)

            const matchesDate = !dateFilter || booking.booking_date === dateFilter
            const matchesStatus = statusFilter === "all" || booking.status === statusFilter

            return matchesSearch && matchesDate && matchesStatus
        })
    }, [bookings, searchTerm, dateFilter, statusFilter])

    const bookingsDisplay = useMemo(
        () => filterByPeriod(filteredBookings, bookingsPeriod, (b) => b.booking_date),
        [filteredBookings, bookingsPeriod],
    )

    // Pagination
    const paginatedBookings = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return bookingsDisplay.slice(startIndex, startIndex + itemsPerPage)
    }, [bookingsDisplay, currentPage])

    const totalPages = Math.ceil(bookingsDisplay.length / itemsPerPage)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, dateFilter, statusFilter, bookingsPeriod])

    // Actions
    const updateBookingPaymentStatus = async (bookingId: string, paymentStatus: string) => {
        setUpdatingPaymentId(bookingId)
        try {
            const response = await fetch("/api/bookings/update-payment-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId, paymentStatus }),
            })

            if (!response.ok) throw new Error("Failed to update payment status")

            toast({
                title: "Success",
                description: paymentStatus === "paid"
                    ? "Payment marked as paid and resident notified"
                    : "Payment status updated",
            })
            fetchBookings()
        } catch (error) {
            toast({ title: "Error", description: "Failed to update payment status", variant: "destructive" })
        } finally {
            setUpdatingPaymentId(null)
        }
    }

    const cancelBooking = async (bookingId: string) => {
        const { data: bookingData } = await supabase
            .from("bookings")
            .select("*, profiles(name, phone_number)")
            .eq("id", bookingId)
            .single()

        if (!bookingData) {
            toast({ title: "Error", description: "Failed to fetch booking details", variant: "destructive" })
            return
        }

        const { error } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId)

        if (error) {
            toast({ title: "Error", description: "Failed to cancel booking", variant: "destructive" })
        } else {
            if (bookingData.profiles?.phone_number) {
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
                    await fetch("/api/twilio/send-template", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            to: bookingData.profiles.phone_number,
                            templateType: "booking_cancelled",
                            variables: {
                                name: bookingData.profiles.name,
                                date: new Date(bookingData.booking_date).toLocaleDateString("en-US", {
                                    month: "long", day: "numeric", year: "numeric",
                                }),
                                startTime: formatTime(bookingData.start_time),
                                endTime: formatTime(bookingData.end_time),
                                bookingId: bookingId.slice(0, 8).toUpperCase(),
                                pdfLink: `${baseUrl}/booking-invoice/${bookingId}?snapshot=cancelled`,
                            },
                        }),
                    })
                } catch (err) {
                    console.error("Failed to send cancellation notification:", err)
                }
            }

            toast({ title: "Success", description: "Booking cancelled and notification sent" })
            fetchBookings()
        }
    }

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case "confirmed":
            case "completed":
            case "paid":
                return "default" as const
            case "pending":
                return "secondary" as const
            case "cancelled":
                return "destructive" as const
            default:
                return "secondary" as const
        }
    }

    const unpaidBookings = useMemo(
        () => bookings.filter((b) => b.status === "confirmed" && b.payment_status === "pending"),
        [bookings],
    )

    const sendBookingReminder = async (bookingId: string) => {
        setSendingReminderId(bookingId)
        try {
            const res = await fetch("/api/bookings/send-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingIds: [bookingId] }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed to send reminder")
            if (result.sent > 0) {
                const booking = bookings.find((b) => b.id === bookingId)
                toast({ title: "Reminder Sent", description: `Reminder sent to ${booking?.profiles?.name || "resident"}` })
            } else {
                toast({ title: "Failed", description: result.errors?.[0] || "Could not send reminder", variant: "destructive" })
            }
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to send reminder", variant: "destructive" })
        } finally {
            setSendingReminderId(null)
        }
    }

    const handleBulkBookingReminder = async () => {
        const ids = unpaidBookings.map((b) => b.id)
        if (ids.length === 0) return

        setSendingBulkReminder(true)
        try {
            const res = await fetch("/api/bookings/send-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingIds: ids }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed to send reminders")
            toast({
                title: "Reminders Sent",
                description: `Sent: ${result.sent}, Failed: ${result.failed} out of ${result.total} bookings`,
            })
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "Failed to send reminders", variant: "destructive" })
        } finally {
            setSendingBulkReminder(false)
        }
    }

    return (
        <Card className="border-0 shadow-lg shadow-manzhil-teal/10">
            <CardHeader className="pb-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-manzhil-dark">
                        <Calendar className="h-5 w-5 text-manzhil-teal" />
                        Bookings
                    </CardTitle>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search bookings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-[180px] border-manzhil-teal/20 focus:border-manzhil-teal"
                            />
                        </div>

                        {/* Date Filter */}
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-[150px] border-manzhil-teal/20"
                        />

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[130px] border-manzhil-teal/20">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Period Filter */}
                        <Select value={bookingsPeriod} onValueChange={(v) => setBookingsPeriod(v as Period)}>
                            <SelectTrigger className="w-[130px] border-manzhil-teal/20">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="daily">Today</SelectItem>
                                <SelectItem value="weekly">This Week</SelectItem>
                                <SelectItem value="monthly">This Month</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Remind All Unpaid */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkBookingReminder}
                            disabled={sendingBulkReminder || unpaidBookings.length === 0}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                            {sendingBulkReminder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                            Remind All Unpaid{unpaidBookings.length > 0 ? ` (${unpaidBookings.length})` : ""}
                        </Button>

                        {/* Export PDF */}
                        <Button
                            onClick={() =>
                                exportToPdf({
                                    title: "Bookings Report",
                                    periodLabel: periodLabel(bookingsPeriod),
                                    columns: [
                                        { header: "Customer", dataKey: "customer" },
                                        { header: "Date", dataKey: "date" },
                                        { header: "Amount", dataKey: "amount" },
                                        { header: "Status", dataKey: "status" },
                                    ],
                                    rows: bookingsDisplay.map((b) => ({
                                        customer: b.profiles?.name || "N/A",
                                        date: formatDateForDisplay(b.booking_date),
                                        amount: `Rs. ${b.booking_charges.toLocaleString()}`,
                                        status: b.status,
                                    })),
                                    fileName: `bookings-${bookingsPeriod}.pdf`,
                                })
                            }
                            variant="outline"
                            size="sm"
                            className="border-manzhil-teal/30 text-manzhil-dark hover:bg-manzhil-teal/5"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block">
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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12">
                                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No bookings found</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedBookings.map((booking) => (
                                    <TableRow key={booking.id} className="hover:bg-manzhil-teal/5 transition-colors">
                                        <TableCell className="font-medium">{booking.profiles?.name || "N/A"}</TableCell>
                                        <TableCell className="text-gray-600">{booking.profiles?.apartment_number}</TableCell>
                                        <TableCell className="text-gray-600">{formatDateForDisplay(booking.booking_date)}</TableCell>
                                        <TableCell className="text-gray-600">
                                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                        </TableCell>
                                        <TableCell className="text-gray-600">Rs. {booking.booking_charges.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={getStatusBadgeVariant(booking.payment_status)}
                                                className={booking.payment_status === "paid" ? "bg-manzhil-teal/20 text-manzhil-dark" : "bg-amber-100 text-amber-700"}
                                            >
                                                {booking.payment_status === "paid" ? (
                                                    <><CheckCircle className="h-3 w-3 mr-1" />Paid</>
                                                ) : (
                                                    <><Clock className="h-3 w-3 mr-1" />Pending</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(booking.status)}>
                                                {booking.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                                {booking.status === "cancelled" && <XCircle className="h-3 w-3 mr-1" />}
                                                {booking.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                {booking.payment_status === "pending" && booking.status === "confirmed" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => sendBookingReminder(booking.id)}
                                                        disabled={sendingReminderId === booking.id}
                                                        className="text-amber-600 hover:bg-amber-50 border-amber-200"
                                                        title="Send payment reminder"
                                                    >
                                                        {sendingReminderId === booking.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Bell className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                                {booking.payment_status === "pending" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
                                                        disabled={updatingPaymentId === booking.id}
                                                        className="text-manzhil-teal hover:bg-manzhil-teal/5 border-manzhil-teal/30"
                                                    >
                                                        {updatingPaymentId === booking.id ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                        ) : (
                                                            <><CheckCircle className="h-4 w-4 mr-1" />Mark Paid</>
                                                        )}
                                                    </Button>
                                                )}
                                                {booking.payment_status === "paid" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateBookingPaymentStatus(booking.id, "pending")}
                                                        disabled={updatingPaymentId === booking.id}
                                                        className="text-red-600 border-red-200"
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />Mark Unpaid
                                                    </Button>
                                                )}
                                                {booking.status === "confirmed" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => cancelBooking(booking.id)}
                                                        className="text-red-600 border-red-200"
                                                    >
                                                        <X className="h-4 w-4 mr-1" />Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {paginatedBookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">No bookings found</p>
                        </div>
                    ) : (
                        paginatedBookings.map((booking) => (
                            <Card key={booking.id} className="border-manzhil-teal/10 shadow-sm">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium text-manzhil-dark">{booking.profiles?.name || "N/A"}</h3>
                                            <p className="text-xs text-muted-foreground">ID: {booking.id.slice(0, 8)}</p>
                                        </div>
                                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                                            {booking.status}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-gray-500 block text-xs">Date</span>
                                            <span className="font-medium text-gray-700">{formatDateForDisplay(booking.booking_date)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Time</span>
                                            <span className="font-medium text-gray-700">{formatTime(booking.start_time)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Apartment</span>
                                            <span className="font-medium text-gray-700">{booking.profiles?.apartment_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs">Amount</span>
                                            <span className="font-medium text-gray-700">Rs. {booking.booking_charges.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                        <Badge
                                            variant={getStatusBadgeVariant(booking.payment_status)}
                                            className={booking.payment_status === "paid" ? "bg-manzhil-teal/20 text-manzhil-dark" : "bg-amber-100 text-amber-700"}
                                        >
                                            {booking.payment_status === "paid" ? "Paid" : "Pending"}
                                        </Badge>

                                        <div className="flex gap-2">
                                            {booking.payment_status === "pending" && booking.status === "confirmed" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => sendBookingReminder(booking.id)}
                                                    disabled={sendingReminderId === booking.id}
                                                    className="h-8 text-amber-600 border-amber-200 hover:bg-amber-50"
                                                    title="Send reminder"
                                                >
                                                    {sendingReminderId === booking.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Bell className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            )}
                                            {booking.payment_status === "pending" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
                                                    disabled={updatingPaymentId === booking.id}
                                                    className="h-8 text-xs text-manzhil-teal border-manzhil-teal/30 hover:bg-manzhil-teal/5"
                                                >
                                                    {updatingPaymentId === booking.id ? (
                                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    ) : "Mark Paid"}
                                                </Button>
                                            )}
                                            {booking.payment_status === "paid" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updateBookingPaymentStatus(booking.id, "pending")}
                                                    disabled={updatingPaymentId === booking.id}
                                                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    Mark Unpaid
                                                </Button>
                                            )}
                                            {booking.status === "confirmed" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => cancelBooking(booking.id)}
                                                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                                {[...Array(Math.min(5, totalPages))].map((_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(i + 1)}
                                            isActive={currentPage === i + 1}
                                            className="cursor-pointer"
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default BookingsTable
