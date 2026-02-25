/**
 * Shared test fixtures
 * Reusable sample data for tests
 */
import type { Profile } from '@/lib/webhook/types'

export const sampleProfile: Profile = {
  id: 'profile-123',
  phone_number: '+923001234567',
  name: 'Ahmed Khan',
  apartment_number: 'A-101',
  is_active: true,
  maintenance_paid: true,
  maintenance_charges: 5000,
  last_payment_date: '2025-01-15',
  cnic: '42101-1234567-1',
  building_block: 'Block A',
  unit_id: 'unit-456',
  created_at: '2024-01-01T00:00:00Z',
}

export const sampleProfileUnpaid: Profile = {
  ...sampleProfile,
  id: 'profile-789',
  name: 'Fatima Ali',
  apartment_number: 'B-202',
  maintenance_paid: false,
  last_payment_date: null,
}

export const sampleUnit = {
  id: 'unit-456',
  apartment_number: 'A-101',
  floor_number: '1',
  unit_type: '2BHK',
  maintenance_charges: 5000,
  maintenance_paid: true,
  last_payment_date: '2025-01-15',
  is_occupied: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
}

export const sampleBooking = {
  id: 'booking-001',
  profile_id: 'profile-123',
  booking_date: '2025-03-15',
  start_time: '09:00:00',
  end_time: '21:00:00',
  status: 'confirmed',
  booking_charges: 10000,
  payment_status: 'pending',
  created_at: '2025-02-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
  profiles: {
    name: 'Ahmed Khan',
    phone_number: '+923001234567',
    apartment_number: 'A-101',
  },
}

export const sampleComplaint = {
  id: 'complaint-uuid-001',
  complaint_id: 'CMP-001',
  profile_id: 'profile-123',
  category: 'apartment',
  subcategory: 'plumbing',
  description: 'Leaking faucet in kitchen',
  status: 'pending',
  group_key: null,
  created_at: '2025-02-01T10:00:00Z',
  updated_at: '2025-02-01T10:00:00Z',
}

export const sampleMaintenancePayment = {
  id: 'payment-001',
  profile_id: 'profile-123',
  unit_id: 'unit-456',
  year: 2025,
  month: 2,
  amount: 5000,
  status: 'unpaid',
  paid_date: null,
  reminder_last_sent_at: null,
  confirmation_sent: false,
  confirmation_sent_at: null,
  created_at: '2025-02-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
  profiles: {
    id: 'profile-123',
    name: 'Ahmed Khan',
    phone_number: '+923001234567',
    apartment_number: 'A-101',
  },
}

export const sampleStaff = {
  id: 'staff-001',
  unit_id: 'unit-456',
  name: 'Ali Driver',
  cnic: '42101-7654321-1',
  phone_number: '+923009876543',
  role: 'driver',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

export const sampleBookingSettings = {
  start_time: '09:00',
  end_time: '21:00',
  slot_duration_minutes: 60,
  working_days: [1, 2, 3, 4, 5, 6], // Mon-Sat
  booking_charges: 10000,
}

export const sampleAdminUser = {
  id: 'admin-001',
  auth_user_id: 'auth-001',
  email: 'admin@example.com',
  name: 'Admin User',
  phone_number: '+923001111111',
  role: 'super_admin' as const,
  is_active: true,
  receive_complaint_notifications: true,
  receive_reminder_notifications: true,
  receive_daily_reports: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

export const sampleStaffAdmin = {
  ...sampleAdminUser,
  id: 'admin-002',
  auth_user_id: 'auth-002',
  email: 'staff@example.com',
  name: 'Staff User',
  role: 'staff' as const,
}
