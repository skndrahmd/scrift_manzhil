import { NextRequest, NextResponse } from "next/server"
import { sendBroadcast } from "@/lib/services/broadcast"
import { ServiceError } from "@/lib/services/complaint"

export async function POST(request: NextRequest) {
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
