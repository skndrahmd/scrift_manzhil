import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface UnitToImport {
  apartment_number: string
  floor_number?: string
  unit_type?: string
  maintenance_charges?: number
}

interface ImportResult {
  imported: number
  skipped: number
  failed: number
  errors: { row: number; apartment_number: string; error: string }[]
}

export async function POST(request: NextRequest) {
  try {
    const { units }: {
      units: (UnitToImport & { rowNumber: number })[]
    } = await request.json()

    if (!Array.isArray(units) || units.length === 0) {
      return NextResponse.json(
        { error: 'units must be a non-empty array' },
        { status: 400 }
      )
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    }

    // Insert units sequentially to handle errors per-row
    for (const unit of units) {
      const { rowNumber, ...unitData } = unit

      const { error } = await supabaseAdmin
        .from('units')
        .insert({
          apartment_number: unitData.apartment_number,
          floor_number: unitData.floor_number || null,
          unit_type: unitData.unit_type || null,
          maintenance_charges: unitData.maintenance_charges || 5000,
          is_occupied: false,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          result.skipped++
          result.errors.push({
            row: rowNumber,
            apartment_number: unitData.apartment_number,
            error: 'Duplicate apartment number - skipped',
          })
        } else {
          result.failed++
          result.errors.push({
            row: rowNumber,
            apartment_number: unitData.apartment_number,
            error: error.message,
          })
        }
      } else {
        result.imported++
      }
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Error in unit bulk import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
