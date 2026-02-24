import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth"
import { updatePaymentVerificationStatus } from "@/lib/services/payment-verification"
import { ServiceError } from "@/lib/services/complaint"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated, adminUser, error } = await verifyAdminAccess("accounting")
  if (!authenticated || !adminUser) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { status, rejection_reason } = body

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      )
    }

    const result = await updatePaymentVerificationStatus(
      id,
      status,
      adminUser.id,
      rejection_reason
    )

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      )
    }
    console.error("[PaymentVerifications] PATCH error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
