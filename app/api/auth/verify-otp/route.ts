import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseAdmin, PAGE_KEYS } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone_number, otp } = body

    if (!phone_number || !otp) {
      return NextResponse.json({ error: "Phone number and OTP are required" }, { status: 400 })
    }

    // Look up valid OTP: matching phone + code, not used, not expired
    const now = new Date().toISOString()
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("admin_otp")
      .select("id")
      .eq("phone_number", phone_number)
      .eq("otp_code", otp)
      .eq("used", false)
      .gte("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    // Mark OTP as used
    await supabaseAdmin
      .from("admin_otp")
      .update({ used: true })
      .eq("id", otpRecord.id)

    // Look up admin user
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("id, auth_user_id, email, role, is_active")
      .eq("phone_number", phone_number)
      .single()

    if (adminError || !adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 400 })
    }

    if (!adminUser.is_active) {
      return NextResponse.json({ error: "Your admin account has been deactivated. Contact a super admin." }, { status: 403 })
    }

    // Generate temp password and update auth user
    const tempPassword = crypto.randomUUID()
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUser.auth_user_id,
      { password: tempPassword }
    )

    if (updateError) {
      console.error("Error updating auth user password:", updateError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
    }

    // Create server-side Supabase client with cookie handlers to set session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Sign in with the temp password to create a real session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: adminUser.email,
      password: tempPassword,
    })

    if (signInError) {
      console.error("Error signing in:", signInError)
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
    }

    // Determine redirect URL based on role and permissions
    let redirectTo = "/admin/dashboard"

    if (adminUser.role === "super_admin") {
      redirectTo = "/admin/dashboard"
    } else {
      // Staff: find first permitted page
      const { data: permissions } = await supabaseAdmin
        .from("admin_permissions")
        .select("page_key")
        .eq("admin_user_id", adminUser.id)
        .eq("can_access", true)

      const PAGE_ORDER = PAGE_KEYS.map(pk => pk.key)
      const PAGE_KEY_TO_ROUTE: Record<string, string> = {}
      PAGE_KEYS.forEach(pk => {
        PAGE_KEY_TO_ROUTE[pk.key] = pk.route
      })

      const permittedKeys = new Set(permissions?.map(p => p.page_key) || [])
      const firstPermittedPage = PAGE_ORDER.find(key => permittedKeys.has(key))

      if (firstPermittedPage) {
        redirectTo = PAGE_KEY_TO_ROUTE[firstPermittedPage]
      } else {
        // No permissions — sign out and return error
        await supabase.auth.signOut()
        return NextResponse.json(
          { error: "You don't have access to any pages. Contact a super admin." },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ success: true, redirectTo })
  } catch (error) {
    console.error("POST /api/auth/verify-otp error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
