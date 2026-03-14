-- Migration: Add Locations Management
-- Description: Creates locations table and links locations to tours, boats, and staff

-- Locations Table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'USA',
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  phone VARCHAR(50),
  email VARCHAR(255),
  description TEXT,
  images TEXT[] DEFAULT '{}',
  operating_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "sunday": {"open": "09:00", "close": "17:00"}}',
  parking_info TEXT,
  amenities TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add location_id to tours
ALTER TABLE tours ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Add location_id to boats
ALTER TABLE boats ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Add location_id to staff (staff can be assigned to specific locations)
ALTER TABLE staff ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_active ON locations(is_active);
CREATE INDEX idx_tours_location ON tours(location_id);
CREATE INDEX idx_boats_location ON boats(location_id);
CREATE INDEX idx_staff_location ON staff(location_id);

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Public read access for active locations
CREATE POLICY "Active locations are viewable by everyone" ON locations FOR SELECT USING (is_active = true);

-- Staff full access to locations
CREATE POLICY "Staff full access to locations" ON locations FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager'))
);

-- Add updated_at trigger for locations
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default location
INSERT INTO locations (name, slug, address, city, state, country, timezone, is_primary, is_active) VALUES
  ('Main Marina', 'main-marina', '123 Harbor Drive', 'Miami', 'FL', 'USA', 'America/New_York', true, true);

-- Update existing tours to use the default location
UPDATE tours SET location_id = (SELECT id FROM locations WHERE is_primary = true LIMIT 1) WHERE location_id IS NULL;
