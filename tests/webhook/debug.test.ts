import { describe, it, expect, beforeEach, vi } from 'vitest'
import { supabaseAdmin } from '@/lib/supabase'
import { getState } from '@/lib/webhook/state'

// Check if both imports point to the same object
console.log('supabaseAdmin from import:', supabaseAdmin)
console.log('supabaseAdmin has __setResult:', typeof (supabaseAdmin as any).__setResult)

describe('Debug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(supabaseAdmin as any).__reset()
  })

  it('debug mock', async () => {
    // Set result BEFORE calling from()
    ;(supabaseAdmin as any).__setResult('bot_sessions', {
      data: { state: { step: 'complaint_category', type: 'complaint' } },
      error: null,
    })
    
    // Now call from() and check what we get
    const builder = supabaseAdmin.from('bot_sessions')
    console.log('Builder from from():', builder)
    console.log('Builder has _setResult:', typeof builder._setResult)
    
    // Check the result
    const result = await builder.select('state').eq('phone_number', '123').single()
    console.log('Direct chain result:', result)
    
    // Now call getState
    const state = await getState('+923001234567')
    console.log('getState result:', state)
    
    expect(state.step).toBe('complaint_category')
  })
})
