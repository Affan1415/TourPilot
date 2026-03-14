-- Migration: Add Captain Assignment to Boats
-- Description: Allows assigning a captain (staff member) to a boat (one captain per boat, one boat per captain)

-- Add assigned_captain_id column to boats table with UNIQUE constraint
-- This ensures each captain can only be assigned to ONE boat at a time
ALTER TABLE boats ADD COLUMN assigned_captain_id UUID UNIQUE REFERENCES staff(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_boats_assigned_captain ON boats(assigned_captain_id);

-- Add comment for documentation
COMMENT ON COLUMN boats.assigned_captain_id IS 'The staff member (captain) assigned to operate this boat. Each captain can only be assigned to one boat.';
