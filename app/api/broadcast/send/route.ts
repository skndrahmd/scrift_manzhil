import { NextRequest, NextResponse } from "next/server"
import { sendBroadcast } from "@/lib/services/broadcast"
import { ServiceError } from "@/lib/services/complaint"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("broadcast")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { variables, recipientIds } = await request.json()
    const result = await sendBroadcast(variables, recipientIds)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[Broadcast] Error:", error)
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 })
  }
}
