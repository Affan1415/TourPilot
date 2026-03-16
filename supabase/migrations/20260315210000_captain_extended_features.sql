-- =============================================
-- Captain Extended Features - Database Schema
-- =============================================

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel Logs Table
CREATE TABLE IF NOT EXISTS fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
    captain_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    availability_id UUID REFERENCES availabilities(id) ON DELETE SET NULL,
    log_type VARCHAR(20),
    fuel_level_percentage INTEGER,
    fuel_gallons DECIMAL(10, 2),
    engine_hours DECIMAL(10, 2),
    oil_level VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Issues Table
CREATE TABLE IF NOT EXISTS maintenance_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES staff(id) ON DELETE CASCADE,
    availability_id UUID REFERENCES availabilities(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    photos JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'open',
    assigned_to UUID REFERENCES staff(id),
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip Logs Table (GPS Tracking)
CREATE TABLE IF NOT EXISTS trip_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    availability_id UUID REFERENCES availabilities(id) ON DELETE CASCADE,
    captain_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boats(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'not_started',
    departed_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    docked_at TIMESTAMPTZ,
    departure_location JSONB,
    return_location JSONB,
    route_data JSONB DEFAULT '[]',
    distance_nm DECIMAL(10, 2),
    max_speed_knots DECIMAL(10, 2),
    avg_speed_knots DECIMAL(10, 2),
    weather_conditions JSONB,
    passenger_count INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Captain Messages Table (Real-time Communication)
CREATE TABLE IF NOT EXISTS captain_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    availability_id UUID REFERENCES availabilities(id) ON DELETE SET NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'chat',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Entries Table (Clock In/Out)
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    captain_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    clock_in_location JSONB,
    clock_out_location JSONB,
    breaks JSONB DEFAULT '[]',
    total_hours DECIMAL(10, 2),
    notes TEXT,
    approved_by UUID REFERENCES staff(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weather Cache Table
CREATE TABLE IF NOT EXISTS weather_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_key VARCHAR(100) NOT NULL UNIQUE,
    weather_data JSONB NOT NULL,
    marine_data JSONB,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Add missing columns to incident_reports if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incident_reports') THEN
        -- Add columns if missing
        BEGIN ALTER TABLE incident_reports ADD COLUMN captain_id UUID REFERENCES staff(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN availability_id UUID REFERENCES availabilities(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN boat_id UUID REFERENCES boats(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN incident_type VARCHAR(50); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN severity VARCHAR(20); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN title TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN location_lat DECIMAL(10, 8); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN location_lng DECIMAL(11, 8); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN location_description TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN photos JSONB DEFAULT '[]'; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN witnesses TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN actions_taken TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN follow_up_required BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN status VARCHAR(20) DEFAULT 'open'; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN resolved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN resolved_by UUID REFERENCES staff(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN resolution_notes TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE incident_reports ADD COLUMN reported_at TIMESTAMPTZ DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
    END IF;
END $$;

-- Insert Default Emergency Contacts
INSERT INTO emergency_contacts (name, phone, type, priority, description) VALUES
    ('U.S. Coast Guard', '911', 'coast_guard', 1, 'Emergency line - Life threatening situations'),
    ('Coast Guard Non-Emergency', '1-800-368-5647', 'coast_guard', 2, 'Non-emergency assistance'),
    ('Port Authority', '555-PORT-001', 'port_authority', 3, 'Marina and port operations'),
    ('Company Emergency Line', '555-TOUR-911', 'company', 4, '24/7 company emergency dispatch'),
    ('Local Hospital', '555-HOSP-001', 'hospital', 5, 'Nearest hospital emergency room'),
    ('Marine Police', '555-MARINE-1', 'police', 6, 'Marine law enforcement')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fuel_logs_boat ON fuel_logs(boat_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON fuel_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_issues_boat ON maintenance_issues(boat_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_issues_status ON maintenance_issues(status);
CREATE INDEX IF NOT EXISTS idx_trip_logs_availability ON trip_logs(availability_id);
CREATE INDEX IF NOT EXISTS idx_trip_logs_captain ON trip_logs(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_messages_recipient ON captain_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_captain ON time_entries(captain_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_location ON weather_cache(location_key);

-- Enable RLS on tables
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE captain_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies (wrapped in exception handlers)
DO $$ BEGIN CREATE POLICY "emergency_contacts_select" ON emergency_contacts FOR SELECT TO authenticated USING (is_active = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "fuel_logs_select" ON fuel_logs FOR SELECT TO authenticated USING (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "fuel_logs_insert" ON fuel_logs FOR INSERT TO authenticated WITH CHECK (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "maintenance_issues_select" ON maintenance_issues FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "maintenance_issues_insert" ON maintenance_issues FOR INSERT TO authenticated WITH CHECK (reported_by IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "trip_logs_select" ON trip_logs FOR SELECT TO authenticated USING (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "trip_logs_insert" ON trip_logs FOR INSERT TO authenticated WITH CHECK (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "trip_logs_update" ON trip_logs FOR UPDATE TO authenticated USING (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "captain_messages_select" ON captain_messages FOR SELECT TO authenticated USING (sender_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) OR recipient_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) OR (recipient_id IS NULL AND EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid()))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "captain_messages_insert" ON captain_messages FOR INSERT TO authenticated WITH CHECK (sender_id IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "captain_messages_update" ON captain_messages FOR UPDATE TO authenticated USING (recipient_id IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "time_entries_select" ON time_entries FOR SELECT TO authenticated USING (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "time_entries_insert" ON time_entries FOR INSERT TO authenticated WITH CHECK (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "time_entries_update" ON time_entries FOR UPDATE TO authenticated USING (captain_id IN (SELECT id FROM staff WHERE user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "weather_cache_select" ON weather_cache FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable realtime for messages
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE captain_messages; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN RAISE NOTICE 'Captain extended features schema created successfully'; END $$;
