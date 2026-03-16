-- Safety Checklists Migration
-- Adds tables for pre-departure safety checklists and captain compliance tracking

-- Checklist Templates (created by admin)
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  -- items structure: [{ "id": "uuid", "label": "Check life jackets", "required": true, "requiresPhoto": false }]
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  -- If tour_id is null, applies to all tours
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist Completions (submitted by captains)
CREATE TABLE IF NOT EXISTS checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  availability_id UUID NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
  captain_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  completed_items JSONB NOT NULL DEFAULT '[]',
  -- completed_items structure: [{ "itemId": "uuid", "checked": true, "photoUrl": "https://...", "note": "..." }]
  photos TEXT[] DEFAULT '{}',
  signature_url TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One completion per tour/checklist per captain
  UNIQUE(checklist_template_id, availability_id, captain_id)
);

-- Incident Reports (safety events)
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID REFERENCES availabilities(id) ON DELETE SET NULL,
  captain_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  incident_type VARCHAR(50) NOT NULL,
  -- Types: 'safety', 'medical', 'equipment', 'weather', 'customer', 'other'
  severity VARCHAR(20) NOT NULL DEFAULT 'low',
  -- Severity: 'low', 'medium', 'high', 'critical'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_description TEXT,
  media_urls TEXT[] DEFAULT '{}',
  witnesses TEXT,
  actions_taken TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'open',
  -- Status: 'open', 'investigating', 'resolved', 'closed'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES staff(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tour Logs (post-tour completion records)
CREATE TABLE IF NOT EXISTS tour_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
  captain_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  actual_departure TIMESTAMPTZ,
  actual_return TIMESTAMPTZ,
  fuel_used DECIMAL(10, 2),
  fuel_unit VARCHAR(20) DEFAULT 'gallons',
  weather_conditions VARCHAR(100),
  sea_conditions VARCHAR(100),
  guest_count INTEGER,
  notes TEXT,
  highlights TEXT,
  issues TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(availability_id, captain_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklist_templates_tour ON checklist_templates(tour_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_active ON checklist_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_availability ON checklist_completions(availability_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_captain ON checklist_completions(captain_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_date ON checklist_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_incident_reports_captain ON incident_reports(captain_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_date ON incident_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_tour_logs_availability ON tour_logs(availability_id);
CREATE INDEX IF NOT EXISTS idx_tour_logs_captain ON tour_logs(captain_id);

-- RLS Policies
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_logs ENABLE ROW LEVEL SECURITY;

-- Checklist Templates: Admin can manage, all staff can read
CREATE POLICY "Admin can manage checklist templates" ON checklist_templates
  FOR ALL USING (is_admin_or_manager());

CREATE POLICY "Staff can view active checklist templates" ON checklist_templates
  FOR SELECT USING (is_staff() AND is_active = true);

-- Checklist Completions: Captains can create/view their own, admin can view all
CREATE POLICY "Captains can create their own completions" ON checklist_completions
  FOR INSERT WITH CHECK (captain_id = get_staff_id());

CREATE POLICY "Captains can view their own completions" ON checklist_completions
  FOR SELECT USING (captain_id = get_staff_id() OR is_admin_or_manager());

CREATE POLICY "Admin can view all completions" ON checklist_completions
  FOR SELECT USING (is_admin_or_manager());

-- Incident Reports: Captains can create/view their own, admin can manage all
CREATE POLICY "Captains can create incident reports" ON incident_reports
  FOR INSERT WITH CHECK (captain_id = get_staff_id());

CREATE POLICY "Captains can view their own incidents" ON incident_reports
  FOR SELECT USING (captain_id = get_staff_id() OR is_admin_or_manager());

CREATE POLICY "Captains can update their own open incidents" ON incident_reports
  FOR UPDATE USING (captain_id = get_staff_id() AND status = 'open');

CREATE POLICY "Admin can manage all incidents" ON incident_reports
  FOR ALL USING (is_admin_or_manager());

-- Tour Logs: Captains can create/view their own, admin can view all
CREATE POLICY "Captains can create tour logs" ON tour_logs
  FOR INSERT WITH CHECK (captain_id = get_staff_id());

CREATE POLICY "Captains can view their own logs" ON tour_logs
  FOR SELECT USING (captain_id = get_staff_id() OR is_admin_or_manager());

CREATE POLICY "Captains can update their own logs" ON tour_logs
  FOR UPDATE USING (captain_id = get_staff_id());

CREATE POLICY "Admin can view all tour logs" ON tour_logs
  FOR SELECT USING (is_admin_or_manager());

-- Insert default safety checklist template
INSERT INTO checklist_templates (name, description, items, is_active) VALUES (
  'Pre-Departure Safety Checklist',
  'Standard safety checklist to complete before every tour departure',
  '[
    {"id": "1", "label": "Life jackets inspected and accessible", "required": true, "requiresPhoto": false},
    {"id": "2", "label": "Fire extinguisher checked and charged", "required": true, "requiresPhoto": false},
    {"id": "3", "label": "First aid kit stocked and accessible", "required": true, "requiresPhoto": false},
    {"id": "4", "label": "Navigation lights working", "required": true, "requiresPhoto": false},
    {"id": "5", "label": "Radio/communication equipment tested", "required": true, "requiresPhoto": false},
    {"id": "6", "label": "Fuel level adequate for trip", "required": true, "requiresPhoto": false},
    {"id": "7", "label": "Engine checked and running properly", "required": true, "requiresPhoto": false},
    {"id": "8", "label": "Weather conditions reviewed", "required": true, "requiresPhoto": false},
    {"id": "9", "label": "Passenger count matches manifest", "required": true, "requiresPhoto": false},
    {"id": "10", "label": "Safety briefing conducted", "required": true, "requiresPhoto": false}
  ]'::jsonb,
  true
) ON CONFLICT DO NOTHING;
