-- Migration: User Hierarchy Changes
-- Description: Update staff roles to support new hierarchy:
--   Admin → Location Manager → Front Desk / Captain
-- Changes:
--   1. Rename 'manager' to 'location_manager'
--   2. Remove 'guide' role
--   3. Add 'reports_to' column for hierarchy

-- Step 1: Migrate existing 'manager' roles to 'location_manager'
UPDATE staff SET role = 'location_manager' WHERE role = 'manager';

-- Step 2: Migrate existing 'guide' roles to 'captain' (or delete if preferred)
UPDATE staff SET role = 'captain' WHERE role = 'guide';

-- Step 3: Drop the old constraint
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;

-- Step 4: Add new constraint with updated roles
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('admin', 'location_manager', 'captain', 'front_desk'));

-- Step 5: Add reports_to column for hierarchy (staff member reports to another staff member)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES staff(id);

-- Step 6: Create index for reports_to lookups
CREATE INDEX IF NOT EXISTS idx_staff_reports_to ON staff(reports_to);

-- Step 7: Update RLS policy for locations to use location_manager
DROP POLICY IF EXISTS "Staff full access to locations" ON locations;
CREATE POLICY "Admin and Location Manager full access to locations" ON locations FOR ALL USING (
  EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'location_manager'))
);

-- Step 8: Update RLS helper functions for new role structure

-- Update is_admin_or_manager to use location_manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'location_manager')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add new function to check for location manager specifically
CREATE OR REPLACE FUNCTION is_location_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role = 'location_manager'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check for front desk
CREATE OR REPLACE FUNCTION is_front_desk()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role = 'front_desk'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check for admin only
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
