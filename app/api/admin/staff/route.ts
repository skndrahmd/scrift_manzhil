import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { verifyAdminAccess, isSuperAdmin } from "@/lib/api-auth"
import { PAGE_KEYS } from "@/lib/supabase"
import { sendStaffInvitation } from "@/lib/twilio/notifications"

// GET - List all staff members
export async function GET() {
  try {
    const { authenticated, error } = await verifyAdminAccess("settings")

    if (!authenticated) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
    }

    // Only super admins can access this
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

    // Fetch all admin users with their permissions
    const { data: users, error: usersError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false })

    if (usersError) {
      console.error("Error fetching staff:", usersError)
      return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
    }

    const { data: permissions } = await supabaseAdmin
      .from("admin_permissions")
      .select("*")

    // Merge permissions with users
    const staffWithPermissions = users?.map(user => ({
      ...user,
      permissions: (permissions || []).filter(p => p.admin_user_id === user.id)
    }))

    return NextResponse.json({ staff: staffWithPermissions })
  } catch (error) {
    console.error("GET /api/admin/staff error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new staff member
export async function POST(request: NextRequest) {
  try {
    const { authenticated, error } = await verifyAdminAccess("settings")

    if (!authenticated) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 })
    }

    const isAdmin = await isSuperAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: "Only super admins can create staff" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      phone_number,
      role,
      receive_complaint_notifications,
      receive_reminder_notifications,
      receive_daily_reports,
      permissions,
    } = body

    // Validate required fields
    if (!name || !phone_number) {
      return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 })
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

    // Generate internal email and random password
    const phoneDigits = phone_number.replace(/\D/g, "")
    const internalEmail = `p${phoneDigits}@manzhil.auth`
    const randomPassword = crypto.randomUUID()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: randomPassword,
      email_confirm: true,
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Create admin_users record
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .insert({
        auth_user_id: authData.user.id,
        email: internalEmail,
        name,
        phone_number,
        role: role || "staff",
        receive_complaint_notifications: receive_complaint_notifications || false,
        receive_reminder_notifications: receive_reminder_notifications || false,
        receive_daily_reports: receive_daily_reports || false,
      })
      .select()
      .single()

    if (adminError) {
      console.error("Error creating admin user:", adminError)
      // Clean up auth user if admin record creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Failed to create admin record" }, { status: 500 })
    }

    // Create permissions for staff role
    if (role === "staff" && permissions && Object.keys(permissions).length > 0) {
      const permissionRows = PAGE_KEYS
        .filter(pk => pk.key !== "settings")
        .map(pk => ({
          admin_user_id: adminUser.id,
          page_key: pk.key,
          can_access: permissions[pk.key] || false,
        }))

      const { error: permError } = await supabaseAdmin
        .from("admin_permissions")
        .insert(permissionRows)

      if (permError) {
        console.error("Error creating permissions:", permError)
        // Non-fatal, continue anyway
      }
    }

    // Send WhatsApp invitation to the new staff member
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://manzhil.scrift.com"}/login`
    const formattedPhone = phone_number.startsWith("+") ? phone_number : `+${phone_number}`
    sendStaffInvitation({ phone: formattedPhone, name, loginUrl }).catch(err => {
      console.error("Failed to send staff invitation:", err)
    })

    return NextResponse.json({ success: true, adminUser })
  } catch (error) {
    console.error("POST /api/admin/staff error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
