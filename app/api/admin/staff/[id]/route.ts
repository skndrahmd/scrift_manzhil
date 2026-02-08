import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyAdminAccess, isSuperAdmin } from "@/lib/api-auth"
import { PAGE_KEYS } from "@/lib/supabase"
import { ADMIN_CACHE_COOKIE } from "@/lib/middleware-cache"

// GET - Get single staff member
export async function GET(
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
      return NextResponse.json({ error: "Only super admins can manage staff" }, { status: 403 })
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

    const { data: user, error: userError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("id", id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    const { data: permissions } = await supabaseAdmin
      .from("admin_permissions")
      .select("*")
      .eq("admin_user_id", id)

    return NextResponse.json({
      staff: {
        ...user,
        permissions: permissions || []
      }
    })
  } catch (error) {
    console.error("GET /api/admin/staff/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update staff member
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
      return NextResponse.json({ error: "Only super admins can update staff" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      phone_number,
      role,
      is_active,
      receive_complaint_notifications,
      receive_reminder_notifications,
      permissions,
    } = body

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

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (phone_number !== undefined) {
      updateData.phone_number = phone_number
      // Regenerate internal email when phone changes
      const phoneDigits = phone_number.replace(/\D/g, "")
      updateData.email = `p${phoneDigits}@manzhil.auth`
    }
    if (role !== undefined) updateData.role = role
    if (is_active !== undefined) updateData.is_active = is_active
    if (receive_complaint_notifications !== undefined) {
      updateData.receive_complaint_notifications = receive_complaint_notifications
    }
    if (receive_reminder_notifications !== undefined) {
      updateData.receive_reminder_notifications = receive_reminder_notifications
    }

    const { data: user, error: updateError } = await supabaseAdmin
      .from("admin_users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    // If phone number changed, update the auth user's email too
    if (!updateError && phone_number !== undefined && user) {
      const phoneDigits = phone_number.replace(/\D/g, "")
      const newEmail = `p${phoneDigits}@manzhil.auth`
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.auth_user_id,
        { email: newEmail }
      )
      if (authUpdateError) {
        console.error("Error updating auth user email:", authUpdateError)
      }
    }

    if (updateError) {
      console.error("Error updating staff:", updateError)
      return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 })
    }

    // Update permissions if provided and role is staff
    if (permissions !== undefined && (role === "staff" || user.role === "staff")) {
      // Delete existing permissions
      await supabaseAdmin
        .from("admin_permissions")
        .delete()
        .eq("admin_user_id", id)

      // Insert new permissions
      const permissionRows = PAGE_KEYS
        .filter(pk => pk.key !== "settings")
        .map(pk => ({
          admin_user_id: id,
          page_key: pk.key,
          can_access: permissions[pk.key] || false,
        }))

      if (permissionRows.length > 0) {
        const { error: permError } = await supabaseAdmin
          .from("admin_permissions")
          .insert(permissionRows)

        if (permError) {
          console.error("Error updating permissions:", permError)
        }
      }
    }

    const res = NextResponse.json({ success: true, staff: user })
    res.cookies.set(ADMIN_CACHE_COOKIE, "", { maxAge: 0, path: "/" })
    return res
  } catch (error) {
    console.error("PUT /api/admin/staff/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { authenticated, adminUser, error } = await verifyAdminAccess("settings")

    if (!authenticated) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
    }

    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Only super admins can delete staff" }, { status: 403 })
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

    // Get the staff member to delete
    const { data: staffToDelete, error: fetchError } = await supabaseAdmin
      .from("admin_users")
      .select("auth_user_id")
      .eq("id", id)
      .single()

    if (fetchError || !staffToDelete) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 })
    }

    // Prevent deleting yourself
    if (adminUser && staffToDelete.auth_user_id === adminUser.auth_user_id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    // Delete permissions first (cascade should handle this, but be explicit)
    await supabaseAdmin
      .from("admin_permissions")
      .delete()
      .eq("admin_user_id", id)

    // Delete admin_users record
    const { error: deleteError } = await supabaseAdmin
      .from("admin_users")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting admin user:", deleteError)
      return NextResponse.json({ error: "Failed to delete staff member" }, { status: 500 })
    }

    // Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
      staffToDelete.auth_user_id
    )

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError)
      // Non-fatal, admin record is already deleted
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set(ADMIN_CACHE_COOKIE, "", { maxAge: 0, path: "/" })
    return res
  } catch (error) {
    console.error("DELETE /api/admin/staff/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
