-- =============================================
-- Add Default Safety Checklist Template
-- =============================================

-- Insert default safety checklist template
INSERT INTO checklist_templates (name, description, is_active, items)
VALUES (
  'Pre-Departure Safety Checklist',
  'Standard safety checklist to complete before every tour departure',
  true,
  '[
    {"id": "item-1", "label": "All passengers have boarded and are accounted for", "required": true, "requiresPhoto": false},
    {"id": "item-2", "label": "Life jackets are accessible and in good condition", "required": true, "requiresPhoto": false},
    {"id": "item-3", "label": "First aid kit is stocked and accessible", "required": true, "requiresPhoto": false},
    {"id": "item-4", "label": "Fire extinguisher is charged and accessible", "required": true, "requiresPhoto": false},
    {"id": "item-5", "label": "Navigation lights are working", "required": true, "requiresPhoto": false},
    {"id": "item-6", "label": "Radio/communication equipment is functional", "required": true, "requiresPhoto": false},
    {"id": "item-7", "label": "Fuel level is adequate for the trip", "required": true, "requiresPhoto": false},
    {"id": "item-8", "label": "Weather conditions have been checked and are safe", "required": true, "requiresPhoto": false},
    {"id": "item-9", "label": "Safety briefing has been given to all passengers", "required": true, "requiresPhoto": false},
    {"id": "item-10", "label": "Engine and steering systems checked", "required": true, "requiresPhoto": false}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Verify
DO $$
DECLARE
  template_count INT;
BEGIN
  SELECT COUNT(*) INTO template_count FROM checklist_templates WHERE is_active = true;
  RAISE NOTICE 'Active checklist templates: %', template_count;
END $$;
