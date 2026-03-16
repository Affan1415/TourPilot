-- =============================================
-- Clean Staff Table and Set Up User Roles
-- =============================================

-- Delete all existing staff records
DELETE FROM staff;

-- Note: Staff records will be created automatically when users sign up
-- and are assigned roles through the admin interface.
-- The staff table links to auth.users, so users must exist first.

-- This migration now only cleans up existing records.
-- Staff members should be created after users sign up.
