import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAccess } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("units")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { apartmentNumbers } = await request.json()

    if (!Array.isArray(apartmentNumbers)) {
      return NextResponse.json(
        { error: 'apartmentNumbers must be an array' },
        { status: 400 }
      )
    }

    const { data: existingUnits, error } = await supabaseAdmin
      .from('units')
      .select('apartment_number')
      .in('apartment_number', apartmentNumbers)

    if (error) {
      console.error('Error checking unit duplicates:', error)
      return NextResponse.json(
        { error: 'Failed to check for duplicates' },
        { status: 500 }
      )
    }

    const existingApartments = existingUnits?.map(u => u.apartment_number) || []

    return NextResponse.json({ existingApartments })
  } catch (error) {
    console.error('Error in unit check-duplicates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
