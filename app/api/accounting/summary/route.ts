import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

// GET /api/accounting/summary - Get financial summary
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
        const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null

        // Get date range for filtering
        const startDate = month
            ? `${year}-${month.toString().padStart(2, '0')}-01`
            : `${year}-01-01`
        const endDate = month
            ? new Date(year, month, 0).toISOString().split('T')[0]
            : `${year}-12-31`

        // Fetch booking revenue (paid bookings)
        const { data: bookings, error: bookingsError } = await supabaseAdmin
            .from("bookings")
            .select("booking_charges, payment_status, booking_date")
            .eq("payment_status", "paid")
            .gte("booking_date", startDate)
            .lte("booking_date", endDate)

        if (bookingsError) throw bookingsError

        // Debug: query ALL bookings without any filters
        const { data: allBookings, error: allBookingsError } = await supabaseAdmin
            .from("bookings")
            .select("id, booking_charges, payment_status, booking_date")

        console.log("=== ACCOUNTING DEBUG ===")
        console.log("Date range:", startDate, "to", endDate)
        console.log("ALL bookings (no filters):", JSON.stringify(allBookings))
        console.log("ALL bookings error:", allBookingsError)
        console.log("Filtered bookings:", JSON.stringify(bookings))

        const bookingRevenue = bookings?.reduce((sum, b) => sum + (b.booking_charges || 0), 0) || 0
        console.log("Booking revenue calculated:", bookingRevenue)

        // Fetch maintenance revenue (paid maintenance)
        const { data: maintenance, error: maintenanceError } = await supabaseAdmin
            .from("maintenance_payments")
            .select("amount, status, year, month")
            .eq("status", "paid")
            .eq("year", year)

        if (maintenanceError) throw maintenanceError

        const maintenanceRevenue = month
            ? maintenance?.filter(m => m.month === month).reduce((sum, m) => sum + (m.amount || 0), 0) || 0
            : maintenance?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0

        // Fetch expenses
        const { data: expenses, error: expensesError } = await supabaseAdmin
            .from("expenses")
            .select("amount, expense_date")
            .gte("expense_date", startDate)
            .lte("expense_date", endDate)

        const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

        // Fetch outstanding dues (unpaid bookings + unpaid maintenance)
        const { data: unpaidBookings } = await supabaseAdmin
            .from("bookings")
            .select("booking_charges")
            .eq("payment_status", "pending")
            .neq("status", "cancelled")

        const { data: unpaidMaintenance } = await supabaseAdmin
            .from("maintenance_payments")
            .select("amount")
            .eq("status", "unpaid")
            .eq("year", year)

        const outstandingBookings = unpaidBookings?.reduce((sum, b) => sum + (b.booking_charges || 0), 0) || 0
        const outstandingMaintenance = unpaidMaintenance?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0
        const outstandingDues = outstandingBookings + outstandingMaintenance

        // Calculate total expected vs collected for collection rate
        const totalExpected = bookingRevenue + maintenanceRevenue + outstandingDues
        const collectionRate = totalExpected > 0 ? ((bookingRevenue + maintenanceRevenue) / totalExpected) * 100 : 100

        // Get monthly breakdown for the year
        const monthlyData = []
        for (let m = 1; m <= 12; m++) {
            const monthStart = `${year}-${m.toString().padStart(2, '0')}-01`
            const monthEnd = new Date(year, m, 0).toISOString().split('T')[0]

            const monthBookings = bookings?.filter(b => {
                const d = new Date(b.booking_date)
                return d.getMonth() + 1 === m
            }).reduce((sum, b) => sum + (b.booking_charges || 0), 0) || 0

            const monthMaintenance = maintenance?.filter(mt => mt.month === m)
                .reduce((sum, mt) => sum + (mt.amount || 0), 0) || 0

            const monthExpenses = expenses?.filter(e => {
                const d = new Date(e.expense_date)
                return d.getMonth() + 1 === m
            }).reduce((sum, e) => sum + (e.amount || 0), 0) || 0

            monthlyData.push({
                month: new Date(year, m - 1).toLocaleString('default', { month: 'short' }),
                bookingIncome: monthBookings,
                maintenanceIncome: monthMaintenance,
                expenses: monthExpenses
            })
        }

        const totalRevenue = bookingRevenue + maintenanceRevenue
        const netIncome = totalRevenue - totalExpenses

        return NextResponse.json({
            totalRevenue,
            bookingRevenue,
            maintenanceRevenue,
            totalExpenses,
            netIncome,
            outstandingDues,
            collectionRate: Math.round(collectionRate * 10) / 10,
            monthlyData,
            year,
            month
        })
    } catch (error: any) {
        console.error("Error fetching financial summary:", error)
        return NextResponse.json(
            { error: error.message || "Failed to fetch financial summary" },
            { status: 500 }
        )
    }
}
