/**
 * Global test setup for Vitest
 * Mocks external services: Supabase, Twilio, Google Translate
 */
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { createMockSupabaseClient } from './mocks/supabase'

// In-memory state store for tests
const stateStore = new Map<string, any>()

// Mock webhook state module (database-backed in production, in-memory for tests)
vi.mock('@/lib/webhook/state', () => ({
  getState: vi.fn(async (phoneNumber: string) => stateStore.get(phoneNumber) || { step: 'initial' }),
  setState: vi.fn(async (phoneNumber: string, state: any) => { stateStore.set(phoneNumber, { ...state, lastActivity: Date.now() }) }),
  updateState: vi.fn(async (phoneNumber: string, updates: any) => {
    const current = stateStore.get(phoneNumber) || { step: 'initial' }
    const newState = { ...current, ...updates, lastActivity: Date.now() }
    stateStore.set(phoneNumber, newState)
    return newState
  }),
  clearState: vi.fn(async (phoneNumber?: string) => {
    if (phoneNumber) stateStore.delete(phoneNumber)
    else stateStore.clear()
  }),
  hasActiveFlow: vi.fn(async (phoneNumber: string) => {
    const state = stateStore.get(phoneNumber)
    return state !== undefined && state.step !== 'initial'
  }),
  isSessionExpired: vi.fn(async (phoneNumber: string) => {
    const state = stateStore.get(phoneNumber)
    if (!state?.lastActivity) return false
    return Date.now() - state.lastActivity > 5 * 60 * 1000
  }),
  cleanupExpiredSessions: vi.fn(async () => 0),
}))

// Mock Supabase clients
vi.mock('@/lib/supabase', () => {
  const mockAdmin = createMockSupabaseClient()
  const mockClient = createMockSupabaseClient()
  return {
    supabaseAdmin: mockAdmin,
    supabase: mockClient,
    BROADCAST_LIMITS: {
      DAILY_MESSAGE_LIMIT: 250,
      MESSAGE_DELAY_MS: 3000,
      BATCH_SIZE: 20,
      BATCH_DELAY_MS: 30000,
      MIN_BROADCAST_INTERVAL_MS: 0,
      SOFT_RECIPIENT_LIMIT: 50,
      HARD_RECIPIENT_LIMIT: 100,
    },
  }
})

// Mock Twilio
vi.mock('@/lib/twilio', () => ({
  sendMaintenancePaymentConfirmed: vi.fn().mockResolvedValue({ ok: true }),
  sendBookingConfirmation: vi.fn().mockResolvedValue({ ok: true }),
  sendBookingReminder: vi.fn().mockResolvedValue({ ok: true }),
  sendComplaintInProgress: vi.fn().mockResolvedValue({ ok: true }),
  sendComplaintCompleted: vi.fn().mockResolvedValue({ ok: true }),
  sendComplaintRejected: vi.fn().mockResolvedValue({ ok: true }),
  sendComplaintPending: vi.fn().mockResolvedValue({ ok: true }),
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ ok: true }),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue({ ok: true }),
  formatMonthYear: vi.fn((year: number, month: number) => `${month}/${year}`),
  formatDate: vi.fn((date: string) => date),
  formatTime: vi.fn((time: string) => time),
  formatDateTime: vi.fn((date: Date) => date.toISOString()),
}))

// Mock Twilio notifications
vi.mock('@/lib/twilio/notifications', () => ({
  sendBroadcastAnnouncement: vi.fn().mockResolvedValue({ ok: true }),
}))

// Mock Google Translate
vi.mock('@/lib/google-translate', () => ({
  translateText: vi.fn().mockResolvedValue('translated text'),
}))

// Mock next/headers (used by API auth)
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}))

// Mock admin notifications
vi.mock('@/lib/admin/notifications', () => ({
  getComplaintNotificationRecipients: vi.fn().mockResolvedValue([]),
  getReminderRecipients: vi.fn().mockResolvedValue([]),
  getAllNotificationRecipients: vi.fn().mockResolvedValue([]),
}))

// Mock instance settings (dynamic timezone/currency)
vi.mock('@/lib/instance-settings', () => ({
  getInstanceSettings: vi.fn().mockResolvedValue({
    timezone: 'Asia/Karachi',
    currencyCode: 'PKR',
    currencySymbol: 'Rs.',
  }),
  getConfiguredTimezone: vi.fn().mockResolvedValue('Asia/Karachi'),
  clearInstanceSettingsCache: vi.fn(),
  INSTANCE_DEFAULTS: {
    timezone: 'Asia/Karachi',
    currencyCode: 'PKR',
    currencySymbol: 'Rs.',
  },
}))

// Mock canonical currency module
vi.mock('@/lib/currency', () => ({
  formatCurrency: vi.fn().mockImplementation(async (amount: number) => `Rs. ${new Intl.NumberFormat('en').format(amount)}`),
  formatCurrencyWith: vi.fn().mockImplementation((amount: number, symbol: string) => `${symbol} ${new Intl.NumberFormat('en').format(amount)}`),
}))

// Mock bot messages module
vi.mock('@/lib/webhook/messages', () => ({
  getMessage: vi.fn(async (key: string, vars?: Record<string, string>, language?: string) => {
    // Return a simple message based on the key
    return `Mock message for ${key}${vars ? ` with vars ${JSON.stringify(vars)}` : ''}`
  }),
  getLabels: vi.fn(async (key: string, language?: string) => {
    return ['Option 1', 'Option 2', 'Option 3']
  }),
}))
