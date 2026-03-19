-- Migration: Complete Location-Based Access
-- Description: Ensures all relevant tables have location_id for proper location filtering

-- Add location_id to checklist_templates if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'checklist_templates' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE checklist_templates ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE CASCADE;
        CREATE INDEX idx_checklist_templates_location ON checklist_templates(location_id);
    END IF;
END
$$;

-- Add location_id to incident_reports if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'incident_reports' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE incident_reports ADD COLUMN location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
        CREATE INDEX idx_incident_reports_location ON incident_reports(location_id);
    END IF;
END
$$;

-- Add location_id to customers if not exists (for location-specific customer tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'primary_location_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN primary_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
        CREATE INDEX idx_customers_location ON customers(primary_location_id);
    END IF;
END
$$;

-- Update existing checklist_templates to use primary location if location_id is null
UPDATE checklist_templates
SET location_id = (SELECT id FROM locations WHERE is_primary = true LIMIT 1)
WHERE location_id IS NULL;

-- Update existing incident_reports to use location from availability's tour
UPDATE incident_reports ir
SET location_id = t.location_id
FROM availabilities a
JOIN tours t ON t.id = a.tour_id
WHERE ir.availability_id = a.id
AND ir.location_id IS NULL;

-- Update existing boats to use primary location if location_id is null
UPDATE boats
SET location_id = (SELECT id FROM locations WHERE is_primary = true LIMIT 1)
WHERE location_id IS NULL;

-- Update existing staff to use primary location if location_id is null
UPDATE staff
SET location_id = (SELECT id FROM locations WHERE is_primary = true LIMIT 1)
WHERE location_id IS NULL;

-- Create a view for location-filtered bookings (via tour -> location relationship)
CREATE OR REPLACE VIEW bookings_with_location AS
SELECT
    b.*,
    t.location_id,
    l.name as location_name
FROM bookings b
JOIN availabilities a ON b.availability_id = a.id
JOIN tours t ON a.tour_id = t.id
LEFT JOIN locations l ON t.location_id = l.id;

-- Grant access to the view
GRANT SELECT ON bookings_with_location TO authenticated;
