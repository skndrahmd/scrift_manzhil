import type { NextRequest } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/dateUtils"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { profileId, unitId } = body

        if (!profileId || !unitId) {
            return new Response(
                JSON.stringify({ error: "profileId and unitId are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        // Verify the profile belongs to this unit
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id, unit_id, is_active")
            .eq("id", profileId)
            .eq("unit_id", unitId)
            .single()

        if (profileError || !profile) {
            return new Response(
                JSON.stringify({ error: "Profile not found in this unit" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            )
        }

        if (!profile.is_active) {
            return new Response(
                JSON.stringify({ error: "Cannot set inactive resident as primary" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        // Unset current primary for this unit
        const { error: unsetError } = await supabaseAdmin
            .from("profiles")
            .update({
                is_primary_resident: false,
                updated_at: getPakistanISOString(),
            })
            .eq("unit_id", unitId)
            .eq("is_primary_resident", true)

        if (unsetError) {
            console.error("[TOGGLE PRIMARY] Unset error:", unsetError)
            throw unsetError
        }

        // Set the new primary
        const { error: setError } = await supabaseAdmin
            .from("profiles")
            .update({
                is_primary_resident: true,
                updated_at: getPakistanISOString(),
            })
            .eq("id", profileId)

        if (setError) {
            console.error("[TOGGLE PRIMARY] Set error:", setError)
            throw setError
        }

        return new Response(
            JSON.stringify({ success: true, message: "Primary resident updated" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        )
    } catch (error) {
        console.error("[TOGGLE PRIMARY] Error:", error)
        return new Response(
            JSON.stringify({ error: "Failed to update primary resident" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
}
