-- Drop existing tables if they exist
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS booking_slots CASCADE;

-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table for admin configuration
CREATE TABLE IF NOT EXISTS booking_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
  working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 1=Monday, 7=Sunday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table for actual bookings with specific time slots
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_date, start_time, end_time)
);

-- Insert default settings
INSERT INTO booking_settings (start_time, end_time, slot_duration_minutes, working_days) 
VALUES ('09:00:00', '17:00:00', 60, '{1,2,3,4,5}')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON bookings(booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Enable all operations for authenticated users" ON profiles
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON booking_settings
  FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON bookings
  FOR ALL USING (true);
