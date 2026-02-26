import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendWelcomeMessage } from '@/lib/twilio/notifications/account'
import { verifyAdminAccess } from '@/lib/auth/api-auth'

interface ResidentToImport {
  name: string
  phone_number: string
  apartment_number: string
  cnic?: string
  building_block?: string
  maintenance_charges?: number
  resident_type?: 'tenant' | 'owner'
}

interface ImportResult {
  imported: number
  skipped: number
  failed: number
  messagesSuccess: number
  messagesFailed: number
  errors: { row: number; name: string; error: string }[]
}

// Delay helper for rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  const { authenticated, error: authError } = await verifyAdminAccess("residents")
  if (!authenticated) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  try {
    const { residents, sendWelcomeMessages = true }: {
      residents: (ResidentToImport & { rowNumber: number })[]
      sendWelcomeMessages: boolean
    } = await request.json()

    if (!Array.isArray(residents) || residents.length === 0) {
      return NextResponse.json(
        { error: 'residents must be a non-empty array' },
        { status: 400 }
      )
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      messagesSuccess: 0,
      messagesFailed: 0,
      errors: [],
    }

    const importedResidents: { name: string; phone_number: string; apartment_number: string }[] = []

    // Cache for unit lookups to avoid repeated queries
    const unitCache = new Map<string, string>()

    // Insert residents sequentially to handle errors gracefully
    for (const resident of residents) {
      const { rowNumber, ...residentData } = resident

      // Find or create unit for this apartment_number
      let unitId: string | null = null
      if (residentData.apartment_number) {
        const cachedUnitId = unitCache.get(residentData.apartment_number)
        if (cachedUnitId) {
          unitId = cachedUnitId
        } else {
          // Check if unit exists
          const { data: existingUnit } = await supabaseAdmin
            .from('units')
            .select('id')
            .eq('apartment_number', residentData.apartment_number)
            .maybeSingle()

          if (existingUnit) {
            unitId = existingUnit.id
          } else {
            // Create the unit
            const { data: newUnit } = await supabaseAdmin
              .from('units')
              .insert({
                apartment_number: residentData.apartment_number,
                maintenance_charges: residentData.maintenance_charges,
                is_occupied: true,
              })
              .select('id')
              .single()

            if (newUnit) {
              unitId = newUnit.id
            }
          }
          if (unitId) {
            unitCache.set(residentData.apartment_number, unitId)
          }
        }
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          name: residentData.name,
          phone_number: residentData.phone_number,
          apartment_number: residentData.apartment_number,
          unit_id: unitId,
          cnic: residentData.cnic || null,
          building_block: residentData.building_block || null,
          resident_type: residentData.resident_type || 'tenant',
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        // Check if it's a duplicate error
        if (error.code === '23505') {
          result.skipped++
          result.errors.push({
            row: rowNumber,
            name: residentData.name,
            error: 'Duplicate phone number - skipped',
          })
        } else {
          result.failed++
          result.errors.push({
            row: rowNumber,
            name: residentData.name,
            error: error.message,
          })
        }
      } else if (data) {
        result.imported++
        importedResidents.push({
          name: data.name,
          phone_number: data.phone_number,
          apartment_number: data.apartment_number,
        })
      }
    }

    // Send welcome messages if enabled
    if (sendWelcomeMessages && importedResidents.length > 0) {
      for (const resident of importedResidents) {
        try {
          await sendWelcomeMessage({
            phone: resident.phone_number,
            name: resident.name,
            apartmentNumber: resident.apartment_number,
          })
          result.messagesSuccess++
        } catch (error) {
          result.messagesFailed++
          console.error(`Failed to send welcome message to ${resident.phone_number}:`, error)
        }

        // Rate limit: 1 second between messages to respect Twilio limits
        if (importedResidents.indexOf(resident) < importedResidents.length - 1) {
          await delay(1000)
        }
      }
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Error in bulk import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
