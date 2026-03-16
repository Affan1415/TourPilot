-- ============================================
-- ALLOW MULTIPLE BOATS PER SLOT
-- ============================================
-- A time slot can have multiple boats assigned to it.
-- Each boat can still only be assigned once per slot+date.

-- Drop the old unique constraint (slot+date must be unique)
ALTER TABLE slot_boat_assignments DROP CONSTRAINT IF EXISTS slot_boat_assignments_default_slot_id_date_key;

-- Add new unique constraint (slot+date+boat must be unique)
-- This allows multiple boats per slot, but prevents the same boat
-- being assigned twice to the same slot on the same date
ALTER TABLE slot_boat_assignments ADD CONSTRAINT slot_boat_assignments_slot_date_boat_unique
  UNIQUE(default_slot_id, date, boat_id);

COMMENT ON TABLE slot_boat_assignments IS 'Stores which boats are assigned to each time slot on each specific date. Multiple boats can be assigned to one slot.';
