-- Grand Oaks Residents' Portal Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'resident' CHECK (role IN ('admin', 'staff', 'resident')),
  phone VARCHAR(20),
  flat_number VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  image_url TEXT,
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_month VARCHAR(20) NOT NULL,
  payment_year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  receipt_url TEXT,
  paid_at TIMESTAMP,
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Amenity bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amenity VARCHAR(50) NOT NULL CHECK (amenity IN ('party_hall', 'tennis_court', 'swimming_pool', 'gym', 'clubhouse')),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  guests_count INTEGER DEFAULT 1,
  purpose TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parcels table
CREATE TABLE IF NOT EXISTS parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID REFERENCES users(id),
  tracking_number VARCHAR(100) NOT NULL,
  sender_name VARCHAR(255),
  courier VARCHAR(100),
  received_at TIMESTAMP DEFAULT NOW(),
  collected_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'notified', 'collected')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  reference_id UUID,
  reference_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_parcels_resident_id ON parcels(resident_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Sample Data --

-- Insert Admin
INSERT INTO users (name, email, password, role, phone, flat_number)
VALUES 
  ('Grand Oaks Admin', 'admin@grandoaks.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewHq6EfBgCIB.WOm', 'admin', '+91-9800000001', 'ADMIN'),
  ('Riya Sharma', 'staff@grandoaks.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewHq6EfBgCIB.WOm', 'staff', '+91-9800000002', 'STAFF'),
  ('Arjun Mehta', 'resident@grandoaks.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewHq6EfBgCIB.WOm', 'resident', '+91-9800000003', 'A-101'),
  ('Priya Patel', 'priya@grandoaks.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewHq6EfBgCIB.WOm', 'resident', '+91-9800000004', 'B-204'),
  ('Rahul Verma', 'rahul@grandoaks.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewHq6EfBgCIB.WOm', 'resident', '+91-9800000005', 'C-302')
ON CONFLICT (email) DO NOTHING;

-- Insert Announcements
INSERT INTO announcements (title, content, category, priority, created_by)
SELECT 
  'Annual General Meeting - May 2026',
  'Dear Residents, the Annual General Meeting will be held on 15th May 2026 at 6:00 PM in the Clubhouse. Attendance is mandatory for all flat owners.',
  'meeting',
  'high',
  id
FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO announcements (title, content, category, priority, created_by)
SELECT 
  'Water Supply Interruption',
  'There will be a scheduled water supply interruption on 10th May from 9 AM to 1 PM for maintenance work. Please store water accordingly.',
  'maintenance',
  'urgent',
  id
FROM users WHERE role = 'admin' LIMIT 1;

INSERT INTO announcements (title, content, category, priority, created_by)
SELECT 
  'Swimming Pool Reopening',
  'We are pleased to announce that the swimming pool has been renovated and will reopen on 12th May 2026. Booking slots are now available.',
  'facility',
  'normal',
  id
FROM users WHERE role = 'admin' LIMIT 1;
