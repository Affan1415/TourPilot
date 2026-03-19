-- Migration: Add tour_waivers join table for many-to-many relationship
-- This allows multiple waivers to be assigned to a single tour

-- Create the join table
CREATE TABLE IF NOT EXISTS tour_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  waiver_template_id UUID NOT NULL REFERENCES waiver_templates(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true, -- Whether this waiver is mandatory for the tour
  display_order INTEGER DEFAULT 0, -- Order in which waivers should be displayed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id, waiver_template_id)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_tour_waivers_tour ON tour_waivers(tour_id);
CREATE INDEX idx_tour_waivers_waiver ON tour_waivers(waiver_template_id);

-- Enable RLS
ALTER TABLE tour_waivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view tour waivers"
  ON tour_waivers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.is_active = true
    )
  );

CREATE POLICY "Admin/Manager can manage tour waivers"
  ON tour_waivers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('admin', 'location_manager')
      AND staff.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('admin', 'location_manager')
      AND staff.is_active = true
    )
  );

-- Public can view tour waivers (needed for booking flow)
CREATE POLICY "Public can view tour waivers"
  ON tour_waivers FOR SELECT
  TO anon
  USING (true);

-- Migrate existing waiver_templates.tour_ids data to the new join table
-- This preserves the existing relationships
DO $$
DECLARE
  template_record RECORD;
  tour_uuid UUID;
BEGIN
  FOR template_record IN
    SELECT id, tour_ids FROM waiver_templates
    WHERE tour_ids IS NOT NULL AND array_length(tour_ids, 1) > 0
  LOOP
    FOREACH tour_uuid IN ARRAY template_record.tour_ids
    LOOP
      INSERT INTO tour_waivers (tour_id, waiver_template_id)
      VALUES (tour_uuid, template_record.id)
      ON CONFLICT (tour_id, waiver_template_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Add a comment explaining the relationship
COMMENT ON TABLE tour_waivers IS 'Join table linking tours to waiver templates. A tour can have multiple waivers, and a waiver can apply to multiple tours.';
