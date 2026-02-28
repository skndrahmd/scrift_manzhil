/**
 * Tests for bot message loading system
 */
import { describe, it, expect } from 'vitest'
import { getMessage, getLabels, getMessageSync } from '@/lib/webhook/messages'
import { MSG } from '@/lib/webhook/message-keys'
import { MESSAGE_DEFAULTS } from '@/lib/webhook/message-defaults'

describe('getMessage', () => {
  it('returns default text when DB returns empty', async () => {
    const result = await getMessage(MSG.FEEDBACK_PROMPT)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('interpolates variables correctly', async () => {
    const result = await getMessage(MSG.MAIN_MENU, {
      name: 'Ahmed',
      options: '1. Test\n2. Test2',
      max_option: '12',
    })
    expect(result).toContain('Ahmed')
    expect(result).toContain('1. Test')
  })

  it('handles undefined variables gracefully', async () => {
    const result = await getMessage(MSG.MAIN_MENU, {
      name: undefined,
      options: 'test',
      max_option: '12',
    })
    expect(result).not.toContain('{name}')
    expect(result).toContain('test')
  })

  it('returns key when default not found', async () => {
    const result = await getMessage('nonexistent.key' as any)
    expect(result).toBe('nonexistent.key')
  })
})

describe('getLabels', () => {
  it('splits newline-delimited strings into array', async () => {
    const labels = await getLabels(MSG.LABELS_MAIN_MENU_OPTIONS)
    expect(Array.isArray(labels)).toBe(true)
    expect(labels.length).toBe(12)
  })

  it('trims whitespace from labels', async () => {
    const labels = await getLabels(MSG.LABELS_MAIN_MENU_OPTIONS)
    for (const label of labels) {
      expect(label).toBe(label.trim())
    }
  })

  it('filters empty strings', async () => {
    const labels = await getLabels(MSG.LABELS_MAIN_MENU_OPTIONS)
    expect(labels.every(l => l.length > 0)).toBe(true)
  })

  it('returns hall menu options', async () => {
    const labels = await getLabels(MSG.LABELS_HALL_MENU_OPTIONS)
    expect(labels.length).toBe(4)
    expect(labels[0]).toBe('New Booking')
  })

  it('returns staff menu options', async () => {
    const labels = await getLabels(MSG.LABELS_STAFF_MENU_OPTIONS)
    expect(labels.length).toBe(4)
  })
})

describe('getMessageSync', () => {
  it('returns default message synchronously', () => {
    const result = getMessageSync(MSG.FEEDBACK_PROMPT)
    expect(result).toBe(MESSAGE_DEFAULTS[MSG.FEEDBACK_PROMPT])
  })

  it('interpolates variables', () => {
    const result = getMessageSync(MSG.MAIN_MENU, {
      name: 'Test',
      options: 'opts',
      max_option: '11',
    })
    expect(result).toContain('Test')
  })

  it('returns key for unknown message', () => {
    const result = getMessageSync('unknown.key' as any)
    expect(result).toBe('unknown.key')
  })
})
