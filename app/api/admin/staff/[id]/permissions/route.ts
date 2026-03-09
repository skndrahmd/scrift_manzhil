import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyAdminAccess, isSuperAdmin } from "@/lib/auth/api-auth"
import { PAGE_KEYS } from "@/lib/supabase"
import { ADMIN_CACHE_COOKIE } from "@/lib/auth/cache"

export const dynamic = 'force-dynamic'

// PUT - Update staff member permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { authenticated, error } = await verifyAdminAccess("settings")

    if (!authenticated) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
    }

    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Only super admins can update permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { permissions } = body

    if (!permissions || typeof permissions !== "object") {
      return NextResponse.json({ error: "Permissions object is required" }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify user exists and is staff
    const { data: user, error: userError } = await supabaseAdmin
      .from("admin_users")
      .select("id, role")
      .eq("id", id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    if (user.role === "super_admin") {
      return NextResponse.json({ error: "Super admins have all permissions" }, { status: 400 })
    }

    // Delete existing permissions
    await supabaseAdmin
      .from("admin_permissions")
      .delete()
      .eq("admin_user_id", id)

    // Insert new permissions
    const permissionRows = PAGE_KEYS
      .filter(pk => pk.key !== "settings") // Settings is super_admin only
      .map(pk => ({
        admin_user_id: id,
        page_key: pk.key,
        can_access: permissions[pk.key] === true,
      }))

    const { data: newPermissions, error: insertError } = await supabaseAdmin
      .from("admin_permissions")
      .insert(permissionRows)
      .select()

    if (insertError) {
      console.error("Error inserting permissions:", insertError)
      return NextResponse.json({ error: "Failed to update permissions" }, { status: 500 })
    }

    const res = NextResponse.json({ success: true, permissions: newPermissions })
    res.cookies.set(ADMIN_CACHE_COOKIE, "", { maxAge: 0, path: "/" })
    return res
  } catch (error) {
    console.error("PUT /api/admin/staff/[id]/permissions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
