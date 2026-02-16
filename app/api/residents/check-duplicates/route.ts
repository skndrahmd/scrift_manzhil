import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAccess } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("residents")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { phoneNumbers } = await request.json()

    if (!Array.isArray(phoneNumbers)) {
      return NextResponse.json(
        { error: 'phoneNumbers must be an array' },
        { status: 400 }
      )
    }

    // Fetch all existing phone numbers that match
    const { data: existingProfiles, error } = await supabaseAdmin
      .from('profiles')
      .select('phone_number')
      .in('phone_number', phoneNumbers)

    if (error) {
      console.error('Error checking duplicates:', error)
      return NextResponse.json(
        { error: 'Failed to check for duplicates' },
        { status: 500 }
      )
    }

    const existingPhones = existingProfiles?.map(p => p.phone_number) || []

    return NextResponse.json({ existingPhones })
  } catch (error) {
    console.error('Error in check-duplicates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
