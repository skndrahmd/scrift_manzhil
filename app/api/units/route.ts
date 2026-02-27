import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getPakistanISOString } from "@/lib/date"
import { verifyAdminAccess } from "@/lib/auth/api-auth"

export async function POST(request: NextRequest) {
    const { authenticated, error: authError } = await verifyAdminAccess("units")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { apartment_number, maintenance_charges, floor_number, unit_type } = body

        if (!apartment_number) {
            return new Response(
                JSON.stringify({ error: "apartment_number is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        if (!maintenance_charges || maintenance_charges <= 0) {
            return new Response(
                JSON.stringify({ error: "maintenance_charges is required and must be greater than 0" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const { data, error } = await supabaseAdmin
            .from("units")
            .insert({
                apartment_number,
                maintenance_charges,
                floor_number: floor_number || null,
                unit_type: unit_type || null,
                is_occupied: false,
            })
            .select()
            .single()

        if (error) {
            if (error.code === "23505") {
                return new Response(
                    JSON.stringify({ error: "A unit with this apartment number already exists" }),
                    { status: 409, headers: { "Content-Type": "application/json" } }
                )
            }
            throw error
        }

        return new Response(JSON.stringify({ success: true, unit: data }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        })
    } catch (error) {
        console.error("[UNITS CREATE] Error:", error)
        return new Response(
            JSON.stringify({ error: "Failed to create unit" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
}

export async function PATCH(request: NextRequest) {
    const { authenticated, error: authError } = await verifyAdminAccess("units")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { unitId, maintenance_charges, floor_number, unit_type } = body

        if (!unitId) {
            return new Response(
                JSON.stringify({ error: "unitId is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        const updates: Record<string, unknown> = {
            updated_at: getPakistanISOString(),
        }
        if (maintenance_charges !== undefined) updates.maintenance_charges = maintenance_charges
        if (floor_number !== undefined) updates.floor_number = floor_number
        if (unit_type !== undefined) updates.unit_type = unit_type

        const { data, error } = await supabaseAdmin
            .from("units")
            .update(updates)
            .eq("id", unitId)
            .select()
            .single()

        if (error) throw error

        return new Response(JSON.stringify({ success: true, unit: data }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    } catch (error) {
        console.error("[UNITS UPDATE] Error:", error)
        return new Response(
            JSON.stringify({ error: "Failed to update unit" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
}

export async function DELETE(request: NextRequest) {
    const { authenticated, error: authError } = await verifyAdminAccess("units")
    if (!authenticated) {
        return NextResponse.json({ error: authError }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const unitId = searchParams.get("unitId")

        if (!unitId) {
            return new Response(
                JSON.stringify({ error: "unitId is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        // Check for active residents
        const { data: activeResidents, error: residentsError } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("unit_id", unitId)
            .eq("is_active", true)

        if (residentsError) throw residentsError

        if (activeResidents && activeResidents.length > 0) {
            return new Response(
                JSON.stringify({ error: "Cannot delete unit with active residents. Please deactivate or remove residents first." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            )
        }

        // Delete maintenance payments
        const { error: paymentsError } = await supabaseAdmin
            .from("maintenance_payments")
            .delete()
            .eq("unit_id", unitId)

        if (paymentsError) throw paymentsError

        // Delete the unit
        const { error: deleteError } = await supabaseAdmin
            .from("units")
            .delete()
            .eq("id", unitId)

        if (deleteError) throw deleteError

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })
    } catch (error) {
        console.error("[UNITS DELETE] Error:", error)
        return new Response(
            JSON.stringify({ error: "Failed to delete unit" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
}
