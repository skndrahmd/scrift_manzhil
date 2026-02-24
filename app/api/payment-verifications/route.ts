import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  const { authenticated, error } = await verifyAdminAccess("accounting")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "all"
  const type = searchParams.get("type") || "all"
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const offset = (page - 1) * limit

  try {
    // Build query
    let query = supabaseAdmin
      .from("payment_verifications")
      .select(`
        *,
        profiles:resident_id (id, name, phone_number, apartment_number),
        units:unit_id (id, apartment_number),
        reviewer:reviewed_by (name)
      `, { count: "exact" })

    // Apply status filter
    if (status !== "all") {
      query = query.eq("status", status)
    }

    // Apply type filter
    if (type !== "all") {
      query = query.eq("payment_type", type)
    }

    // Apply search (by resident name or apartment number via profiles/units)
    // We'll filter after fetching since Supabase doesn't support OR across joins easily
    // For performance, we fetch with pagination and filter server-side

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: verifications, count, error: queryError } = await query

    if (queryError) {
      console.error("[PaymentVerifications] Query error:", queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // Client-side search filter on name/apartment
    let filtered = verifications || []
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((v: any) => {
        const name = v.profiles?.name?.toLowerCase() || ""
        const apt = v.units?.apartment_number?.toLowerCase() || ""
        return name.includes(searchLower) || apt.includes(searchLower)
      })
    }

    // Get pending count for badge
    const { count: pendingCount } = await supabaseAdmin
      .from("payment_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      verifications: filtered,
      totalPages,
      totalCount,
      pendingCount: pendingCount || 0,
    })
  } catch (err) {
    console.error("[PaymentVerifications] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
