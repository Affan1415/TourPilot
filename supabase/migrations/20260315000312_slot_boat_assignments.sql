-- ============================================
-- SLOT BOAT ASSIGNMENTS
-- ============================================
-- Stores boat assignments for specific date + slot combinations
-- Since default slots repeat daily, we need to track which boat
-- is assigned to each slot on each specific date.

CREATE TABLE IF NOT EXISTS slot_boat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_slot_id UUID NOT NULL REFERENCES tour_default_slots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- A slot on a given date can only have one boat
  UNIQUE(default_slot_id, date)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_slot_boat_assignments_date ON slot_boat_assignments(date);
CREATE INDEX IF NOT EXISTS idx_slot_boat_assignments_boat ON slot_boat_assignments(boat_id);
CREATE INDEX IF NOT EXISTS idx_slot_boat_assignments_slot_date ON slot_boat_assignments(default_slot_id, date);

-- RLS
ALTER TABLE slot_boat_assignments ENABLE ROW LEVEL SECURITY;

-- Public can view (for booking flow)
CREATE POLICY "Public can view slot boat assignments" ON slot_boat_assignments
  FOR SELECT USING (true);

-- Staff can manage
CREATE POLICY "Staff can manage slot boat assignments" ON slot_boat_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager'))
  );

COMMENT ON TABLE slot_boat_assignments IS 'Stores which boat is assigned to each time slot on each specific date';
