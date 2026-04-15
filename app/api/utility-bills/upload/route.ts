import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: Request) {
    const { authenticated, error: authError } = await verifyAdminAccess("broadcast")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const formData = await request.formData()
        const files = formData.getAll("images") as File[]

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, error: "No images provided" },
                { status: 400 }
            )
        }

        const now = new Date()
        const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

        const results: Record<string, { url: string; error?: string }> = {}

        for (const file of files) {
            if (!file.type.startsWith("image/")) {
                results[file.name] = { url: "", error: "Not an image file" }
                continue
            }

            const timestamp = Date.now()
            // Sanitize filename for storage path
            const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
            const storagePath = `${monthFolder}/${timestamp}_${safeName}`

            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const { error: uploadError } = await supabaseAdmin.storage
                .from("utility-bills")
                .upload(storagePath, buffer, {
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                console.error("[UtilityBills Upload] Storage error:", uploadError)
                results[file.name] = { url: "", error: uploadError.message }
                continue
            }

            const { data: urlData } = supabaseAdmin.storage
                .from("utility-bills")
                .getPublicUrl(storagePath)

            results[file.name] = { url: urlData.publicUrl }
        }

        return NextResponse.json({ success: true, results })
    } catch (error) {
        console.error("[UtilityBills Upload] Error:", error)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
