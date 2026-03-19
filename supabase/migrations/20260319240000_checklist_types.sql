-- Migration: Add Pre/Post Checklist Types
-- Description: Adds a type column to differentiate pre-departure and post-trip checklists

-- ============================================
-- ADD CHECKLIST TYPE COLUMN
-- ============================================

-- Add checklist_type column with default 'pre' for existing templates
ALTER TABLE checklist_templates
ADD COLUMN IF NOT EXISTS checklist_type VARCHAR(10) DEFAULT 'pre'
CHECK (checklist_type IN ('pre', 'post'));

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_checklist_templates_type ON checklist_templates(checklist_type);

-- ============================================
-- UPDATE EXISTING TEMPLATES
-- ============================================

-- Mark existing templates as 'pre' (they were pre-departure by default)
UPDATE checklist_templates SET checklist_type = 'pre' WHERE checklist_type IS NULL;

-- ============================================
-- ADD DEFAULT POST-TRIP CHECKLIST TEMPLATE
-- ============================================

INSERT INTO checklist_templates (name, description, is_active, checklist_type, items)
VALUES (
  'Post-Trip Checklist',
  'Standard checklist to complete after every tour',
  true,
  'post',
  '[
    {"id": "post-1", "label": "All passengers have safely disembarked", "required": true, "requiresPhoto": false},
    {"id": "post-2", "label": "Boat has been secured and tied properly", "required": true, "requiresPhoto": false},
    {"id": "post-3", "label": "All safety equipment returned to storage", "required": true, "requiresPhoto": false},
    {"id": "post-4", "label": "Fuel level checked and logged", "required": true, "requiresPhoto": false},
    {"id": "post-5", "label": "Cabin/deck cleaned of trash and debris", "required": true, "requiresPhoto": false},
    {"id": "post-6", "label": "Any equipment issues or damage reported", "required": true, "requiresPhoto": false},
    {"id": "post-7", "label": "Coolers emptied and cleaned", "required": false, "requiresPhoto": false},
    {"id": "post-8", "label": "Electronics powered down and secured", "required": true, "requiresPhoto": false},
    {"id": "post-9", "label": "Boat cover applied (if applicable)", "required": false, "requiresPhoto": true},
    {"id": "post-10", "label": "Trip log completed with notes", "required": true, "requiresPhoto": false}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================
-- UPDATE CHECKLIST COMPLETIONS TABLE
-- ============================================

-- Add checklist_type to completions for easier querying
ALTER TABLE checklist_completions
ADD COLUMN IF NOT EXISTS checklist_type VARCHAR(10) DEFAULT 'pre'
CHECK (checklist_type IN ('pre', 'post'));

-- Create index for filtering completions by type
CREATE INDEX IF NOT EXISTS idx_checklist_completions_type ON checklist_completions(checklist_type);
