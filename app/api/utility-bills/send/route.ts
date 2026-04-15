import { NextResponse } from "next/server"
import { supabaseAdmin, BROADCAST_LIMITS } from "@/lib/supabase"
import { verifyAdminAccess } from "@/lib/auth/api-auth"
import { sendUtilityBillMessage } from "@/lib/twilio/notifications/broadcast"
import { checkBroadcastUsage } from "@/lib/services/broadcast"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface BillRecipient {
    phone: string
    houseNo: string
    billUrl: string
}

export async function POST(request: Request) {
    const { authenticated, error: authError } = await verifyAdminAccess("broadcast")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const body = await request.json()
        const recipients: BillRecipient[] = body.recipients

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json(
                { success: false, error: "No recipients specified" },
                { status: 400 }
            )
        }

        // Check daily limit (shared with regular broadcasts)
        const { remaining, logsError } = await checkBroadcastUsage()

        if (!logsError || logsError.code !== "42P01") {
            if (remaining < recipients.length) {
                return NextResponse.json(
                    { success: false, error: `Daily limit exceeded. Only ${remaining} messages remaining today.` },
                    { status: 429 }
                )
            }
        }

        const results: {
            houseNo: string
            phone: string
            success: boolean
            error?: string
        }[] = []

        // Send messages with same batch rate limiting as regular broadcasts
        for (let i = 0; i < recipients.length; i++) {
            const { phone, houseNo, billUrl } = recipients[i]

            const result = await sendUtilityBillMessage({ phone, houseNo, billUrl })

            results.push({
                houseNo,
                phone,
                success: result.ok,
                error: result.error,
            })

            // 3s delay between messages
            if (i < recipients.length - 1) {
                await delay(BROADCAST_LIMITS.MESSAGE_DELAY_MS)
            }

            // 30s pause after each batch of 20
            if (
                (i + 1) % BROADCAST_LIMITS.BATCH_SIZE === 0 &&
                i < recipients.length - 1
            ) {
                console.log(`[UtilityBills] Batch ${Math.floor((i + 1) / BROADCAST_LIMITS.BATCH_SIZE)} complete, pausing...`)
                await delay(BROADCAST_LIMITS.BATCH_DELAY_MS)
            }
        }

        const successCount = results.filter(r => r.success).length
        const failedCount = results.filter(r => !r.success).length

        // Log to broadcast_logs (counts toward daily limit)
        if (!logsError || logsError.code !== "42P01") {
            const { error: logError } = await supabaseAdmin
                .from("broadcast_logs")
                .insert({
                    recipient_count: recipients.length,
                    success_count: successCount,
                    failed_count: failedCount,
                    message_title: "Utility Bills",
                    message_body: `Utility bill broadcast sent to ${recipients.length} residents`,
                })

            if (logError) {
                console.error("[UtilityBills] Error logging broadcast:", logError)
            }
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: recipients.length,
                success: successCount,
                failed: failedCount,
            },
        })
    } catch (error) {
        console.error("[UtilityBills Send] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
