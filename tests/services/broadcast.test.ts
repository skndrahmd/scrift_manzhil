/**
 * Tests for broadcast rate limiting constants
 */
import { describe, it, expect } from 'vitest'
import { BROADCAST_LIMITS } from '@/lib/supabase'

describe('BROADCAST_LIMITS', () => {
  it('has a daily message limit of 250', () => {
    expect(BROADCAST_LIMITS.DAILY_MESSAGE_LIMIT).toBe(250)
  })

  it('has message delay of 3 seconds', () => {
    expect(BROADCAST_LIMITS.MESSAGE_DELAY_MS).toBe(3000)
  })

  it('has batch size of 20', () => {
    expect(BROADCAST_LIMITS.BATCH_SIZE).toBe(20)
  })

  it('has batch delay of 30 seconds', () => {
    expect(BROADCAST_LIMITS.BATCH_DELAY_MS).toBe(30000)
  })

  it('has cooldown disabled (0)', () => {
    expect(BROADCAST_LIMITS.MIN_BROADCAST_INTERVAL_MS).toBe(0)
  })

  it('has soft recipient limit of 50', () => {
    expect(BROADCAST_LIMITS.SOFT_RECIPIENT_LIMIT).toBe(50)
  })

  it('has hard recipient limit of 100', () => {
    expect(BROADCAST_LIMITS.HARD_RECIPIENT_LIMIT).toBe(100)
  })
})
