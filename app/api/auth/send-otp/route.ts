import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase"
import { sendOtpMessage } from "@/lib/twilio/notifications"

const OTP_EXPIRY_MINUTES = 5
const OTP_RATE_LIMIT_MINUTES = 3

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone_number } = body

    if (!phone_number) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    // Look up admin user by phone number
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("id, is_active, phone_number")
      .eq("phone_number", phone_number)
      .single()

    if (adminError || !adminUser) {
      // Return generic error to avoid phone enumeration
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 })
    }

    if (!adminUser.is_active) {
      return NextResponse.json({ error: "Your admin account has been deactivated. Contact a super admin." }, { status: 403 })
    }

    // Rate limit: check if OTP was sent to this phone in the last 3 minutes
    const rateLimitCutoff = new Date(Date.now() - OTP_RATE_LIMIT_MINUTES * 60 * 1000).toISOString()
    const { data: recentOtp } = await supabaseAdmin
      .from("admin_otp")
      .select("id, created_at")
      .eq("phone_number", phone_number)
      .gte("created_at", rateLimitCutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (recentOtp) {
      const createdAt = new Date(recentOtp.created_at).getTime()
      const waitSeconds = Math.ceil((createdAt + OTP_RATE_LIMIT_MINUTES * 60 * 1000 - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Please wait ${waitSeconds} seconds before requesting another OTP` },
        { status: 429 }
      )
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString()

    // Invalidate existing unused OTPs for this phone
    await supabaseAdmin
      .from("admin_otp")
      .update({ used: true })
      .eq("phone_number", phone_number)
      .eq("used", false)

    // Store OTP with expiry
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()
    const { error: insertError } = await supabaseAdmin
      .from("admin_otp")
      .insert({
        phone_number,
        otp_code: otp,
        expires_at: expiresAt,
        used: false,
      })

    if (insertError) {
      console.error("Error storing OTP:", insertError)
      return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 })
    }

    // Send OTP via WhatsApp
    const result = await sendOtpMessage({ phone: phone_number, otp })

    if (!result.ok) {
      console.error("Failed to send OTP via WhatsApp:", result.error)
      return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/send-otp error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
