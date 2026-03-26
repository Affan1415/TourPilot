-- Migration: Allow captains to be assigned to multiple boats
-- Description: Creates a junction table for many-to-many captain-boat relationships

-- Create captain_boats junction table
CREATE TABLE IF NOT EXISTS captain_boats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    captain_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure a captain can only be assigned to a boat once
    UNIQUE(captain_id, boat_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_captain_boats_captain ON captain_boats(captain_id);
CREATE INDEX idx_captain_boats_boat ON captain_boats(boat_id);

-- Migrate existing captain assignments from boats table
INSERT INTO captain_boats (captain_id, boat_id, is_primary)
SELECT assigned_captain_id, id, true
FROM boats
WHERE assigned_captain_id IS NOT NULL
ON CONFLICT (captain_id, boat_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE captain_boats IS 'Junction table allowing captains to be assigned to multiple boats';
COMMENT ON COLUMN captain_boats.is_primary IS 'Whether this is the primary boat for the captain';

-- Note: We keep the assigned_captain_id column on boats for backwards compatibility
-- It can be removed in a future migration once the UI is fully updated
