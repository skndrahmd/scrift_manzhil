import type { NextRequest } from "next/server"
import { updateComplaintStatus, ServiceError } from "@/lib/services/complaint"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await updateComplaintStatus(body?.complaintId, body?.status)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return new Response(
        JSON.stringify({ error: error.message, ...(error.code ? { code: error.code } : {}) }),
        { status: error.status, headers: { "Content-Type": "application/json" } }
      )
    }
    console.error("Complaint status update error:", error)
    return new Response(JSON.stringify({ error: "Unable to update complaint status" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
