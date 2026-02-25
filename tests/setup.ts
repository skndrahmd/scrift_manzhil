/**
 * Global test setup for Vitest
 * Mocks external services: Supabase, Twilio, Google Translate
 */
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { createMockSupabaseClient } from './mocks/supabase'

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
