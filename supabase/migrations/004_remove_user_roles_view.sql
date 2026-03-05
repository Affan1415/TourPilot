-- =============================================
-- Remove user_roles view and use staff table directly
-- =============================================

-- Update get_user_role function to use staff and customers tables directly
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  staff_role TEXT;
BEGIN
  -- First check if user is staff
  SELECT role INTO staff_role
  FROM staff
  WHERE user_id = auth.uid() AND is_active = true;

  IF staff_role IS NOT NULL THEN
    RETURN staff_role;
  END IF;

  -- Check if user is customer
  IF EXISTS (SELECT 1 FROM customers WHERE user_id = auth.uid()) THEN
    RETURN 'customer';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the user_roles view (no longer needed)
DROP VIEW IF EXISTS user_roles;

-- Revoke any grants on the dropped view (cleanup)
-- REVOKE ALL ON user_roles FROM authenticated; -- This will error if view doesn't exist, so we skip it
