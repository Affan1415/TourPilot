-- Migration: Tour-Boats Many-to-Many and Blackout Dates
-- Description: Allows multiple boats per tour and exception-based availability

-- ============================================
-- TOUR-BOATS JUNCTION TABLE
-- ============================================

-- A tour can have multiple boats assigned
-- Note: A boat CAN be assigned to multiple tours (shared resource)
CREATE TABLE IF NOT EXISTS tour_boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Primary/featured boat for this tour
  price_modifier DECIMAL(10, 2) DEFAULT 0, -- Price adjustment for this boat (+/-)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tour_id, boat_id) -- Prevent duplicate assignment of same boat to same tour
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tour_boats_tour ON tour_boats(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_boats_boat ON tour_boats(boat_id);

-- ============================================
-- DEFAULT TOUR SCHEDULE (Daily Availability)
-- ============================================

-- Default time slots for tours (these repeat every day unless blackout)
CREATE TABLE IF NOT EXISTS tour_default_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price_override DECIMAL(10, 2), -- NULL = use tour base price
  capacity_override INTEGER, -- NULL = use tour max capacity
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}', -- All days by default
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_default_slots_tour ON tour_default_slots(tour_id);

-- ============================================
-- BLACKOUT/UNAVAILABILITY DATES
-- ============================================

-- Tour-level blackouts (entire tour unavailable on date)
CREATE TABLE IF NOT EXISTS tour_blackouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tour_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tour_blackouts_tour_date ON tour_blackouts(tour_id, date);

-- Boat-level blackouts (specific boat unavailable on date)
CREATE TABLE IF NOT EXISTS boat_blackouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT, -- e.g., "Maintenance", "Private charter", "Weather"
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(boat_id, date)
);

CREATE INDEX IF NOT EXISTS idx_boat_blackouts_boat_date ON boat_blackouts(boat_id, date);

-- Slot-level exceptions (override specific time slot on specific date)
CREATE TABLE IF NOT EXISTS slot_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  default_slot_id UUID REFERENCES tour_default_slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Override values (NULL = use default, non-NULL = override)
  start_time TIME,
  end_time TIME,
  price_override DECIMAL(10, 2),
  capacity_override INTEGER,
  boat_id UUID REFERENCES boats(id) ON DELETE SET NULL, -- Specific boat for this slot
  is_cancelled BOOLEAN DEFAULT false, -- True = slot doesn't run this day
  reason TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tour_id, default_slot_id, date)
);

CREATE INDEX IF NOT EXISTS idx_slot_exceptions_tour_date ON slot_exceptions(tour_id, date);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE tour_boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_default_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_exceptions ENABLE ROW LEVEL SECURITY;

-- Public read access for active tours
CREATE POLICY "Public can view tour boats" ON tour_boats FOR SELECT USING (true);
CREATE POLICY "Public can view tour slots" ON tour_default_slots FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view tour blackouts" ON tour_blackouts FOR SELECT USING (true);
CREATE POLICY "Public can view boat blackouts" ON boat_blackouts FOR SELECT USING (true);
CREATE POLICY "Public can view slot exceptions" ON slot_exceptions FOR SELECT USING (true);

-- Staff full access
CREATE POLICY "Staff can manage tour_boats" ON tour_boats FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager'))
);
CREATE POLICY "Staff can manage tour_default_slots" ON tour_default_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager'))
);
CREATE POLICY "Staff can manage tour_blackouts" ON tour_blackouts FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager'))
);
CREATE POLICY "Staff can manage boat_blackouts" ON boat_blackouts FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager', 'captain'))
);
CREATE POLICY "Staff can manage slot_exceptions" ON slot_exceptions FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager'))
);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER tour_default_slots_updated_at
  BEFORE UPDATE ON tour_default_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE tour_boats IS 'Junction table linking tours to their assigned boats (many-to-many)';
COMMENT ON TABLE tour_default_slots IS 'Default daily time slots for each tour';
COMMENT ON TABLE tour_blackouts IS 'Dates when an entire tour is unavailable';
COMMENT ON TABLE boat_blackouts IS 'Dates when a specific boat is unavailable';
COMMENT ON TABLE slot_exceptions IS 'Exceptions/overrides for specific slots on specific dates';
