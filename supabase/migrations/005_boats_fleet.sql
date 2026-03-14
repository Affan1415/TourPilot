-- Migration: Add Boats/Fleet Management
-- Description: Creates boats table and links boats to tours and availabilities

-- Boats Table
CREATE TABLE IF NOT EXISTS boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  boat_type VARCHAR(100), -- e.g., 'pontoon', 'speedboat', 'catamaran', 'yacht'
  capacity INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}', -- e.g., ['shade cover', 'bluetooth speaker', 'cooler']
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  maintenance_notes TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add boat_id to tours (default boat for a tour)
ALTER TABLE tours ADD COLUMN IF NOT EXISTS boat_id UUID REFERENCES boats(id) ON DELETE SET NULL;

-- Add boat_id to availabilities (can override tour's default boat per slot)
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS boat_id UUID REFERENCES boats(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_boats_status ON boats(status);
CREATE INDEX IF NOT EXISTS idx_tours_boat ON tours(boat_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_boat ON availabilities(boat_id);

-- Enable RLS
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Active boats are viewable by everyone" ON boats;
DROP POLICY IF EXISTS "Staff full access to boats" ON boats;

-- Public read access for active boats
CREATE POLICY "Active boats are viewable by everyone" ON boats FOR SELECT USING (status = 'active');

-- Staff full access to boats
CREATE POLICY "Staff full access to boats" ON boats FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true)
);

-- Add updated_at trigger for boats
DROP TRIGGER IF EXISTS boats_updated_at ON boats;
CREATE TRIGGER boats_updated_at BEFORE UPDATE ON boats FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert sample boats for testing
INSERT INTO boats (name, registration_number, boat_type, capacity, description, features, status) VALUES
  ('Sea Breeze', 'FL-1234-AB', 'pontoon', 12, 'Our flagship pontoon boat, perfect for family tours', ARRAY['shade cover', 'bluetooth speaker', 'cooler', 'comfortable seating'], 'active'),
  ('Ocean Spirit', 'FL-5678-CD', 'catamaran', 20, 'Spacious catamaran for larger groups', ARRAY['dual deck', 'restroom', 'bar area', 'shade cover'], 'active'),
  ('Wave Runner', 'FL-9012-EF', 'speedboat', 6, 'Fast and fun speedboat for thrill seekers', ARRAY['life jackets', 'waterproof storage'], 'active');
