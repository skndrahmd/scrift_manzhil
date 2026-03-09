import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

// GET - Fetch all amenities
export async function GET() {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { data, error: dbError } = await supabaseAdmin
    .from("amenities")
    .select("*")
    .order("sort_order", { ascending: true })

  if (dbError) {
    console.error("Failed to fetch amenities:", dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ amenities: data })
}

// POST - Create new amenity
export async function POST(req: Request) {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, open_time, close_time, is_under_maintenance, sort_order } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Amenity name is required" },
        { status: 400 }
      )
    }

    const { data, error: dbError } = await supabaseAdmin
      .from("amenities")
      .insert({
        name: name.trim(),
        open_time: open_time || null,
        close_time: close_time || null,
        is_under_maintenance: is_under_maintenance || false,
        is_active: true,
        sort_order: sort_order || 1,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Failed to create amenity:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ amenity: data })
  } catch (err) {
    console.error("Error creating amenity:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update amenity
export async function PATCH(req: Request) {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, name, open_time, close_time, is_under_maintenance, is_active, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: "Amenity ID is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name.trim()
    if (open_time !== undefined) updateData.open_time = open_time
    if (close_time !== undefined) updateData.close_time = close_time
    if (is_under_maintenance !== undefined) updateData.is_under_maintenance = is_under_maintenance
    if (is_active !== undefined) updateData.is_active = is_active
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data, error: dbError, count } = await supabaseAdmin
      .from("amenities")
      .update(updateData)
      .eq("id", id)
      .select()

    if (dbError) {
      console.error("Failed to update amenity:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error("No amenity found with id:", id)
      return NextResponse.json({ error: "Amenity not found" }, { status: 404 })
    }

    return NextResponse.json({ amenity: data[0] })
  } catch (err) {
    console.error("Error updating amenity:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete amenity
export async function DELETE(req: Request) {
  const { authenticated, error } = await verifyAdminAccess("settings")
  if (!authenticated) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Amenity ID is required" }, { status: 400 })
    }

    const { error: dbError } = await supabaseAdmin
      .from("amenities")
      .delete()
      .eq("id", id)

    if (dbError) {
      console.error("Failed to delete amenity:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error deleting amenity:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
