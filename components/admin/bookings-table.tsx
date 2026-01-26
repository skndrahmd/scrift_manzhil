"use client"

import { useState, useMemo, useEffect } from "react"
import { useAdmin } from "@/app/admin/layout"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-manzhil-dark flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-manzhil-teal" />
                        Bookings Management
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Track and manage community hall bookings</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-[160px]"
                />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={bookingsPeriod} onValueChange={(v) => setBookingsPeriod(v as Period)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="daily">Today</SelectItem>
                        <SelectItem value="weekly">This Week</SelectItem>
                        <SelectItem value="monthly">This Month</SelectItem>
                    </SelectContent>
                </Select>

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
                    className="border-manzhil-teal/30 text-manzhil-dark hover:bg-manzhil-teal/5 transition-colors"
                >
                    <Eye className="h-4 w-4 mr-2" />
                    Export PDF
                </Button>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-lg shadow-manzhil-teal/5 hover:shadow-xl transition-shadow">
                <CardContent className="p-0">
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
                                                {booking.payment_status === "pending" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateBookingPaymentStatus(booking.id, "paid")}
                                                        disabled={updatingPaymentId === booking.id}
                                                        className="text-manzhil-teal hover:bg-manzhil-teal/5"
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
                                                        className="text-red-600"
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" />Mark Unpaid
                                                    </Button>
                                                )}
                                                {booking.status === "confirmed" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => cancelBooking(booking.id)}
                                                        className="text-red-600"
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
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
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
            )}
        </div>
    )
}

export default BookingsTable
