import { supabaseAdmin } from '@/lib/supabase'

/**
 * Syncs resident_type across all residents in a unit.
 * When one resident's type is changed to owner/tenant,
 * all other residents in the same unit are updated to match.
 * 
 * @param unitId - The unit ID to sync residents for
 * @param residentType - The resident_type to set for all residents ('owner' or 'tenant')
 * @returns Promise<boolean> - true if successful, false if failed
 */
export async function syncResidentTypeForUnit(
  unitId: string,
  residentType: 'owner' | 'tenant'
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ resident_type: residentType })
      .eq('unit_id', unitId)
      .eq('is_active', true)

    if (error) {
      console.error('Failed to sync resident_type for unit:', unitId, error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception syncing resident_type for unit:', unitId, error)
    return false
  }
}
