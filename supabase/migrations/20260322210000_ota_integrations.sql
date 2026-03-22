-- OTA (Online Travel Agency) Integration Tables
-- Supports Viator, GetYourGuide, Airbnb Experiences

-- OTA Connections table
CREATE TABLE IF NOT EXISTS ota_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('viator', 'getyourguide', 'airbnb', 'tripadvisor')),
    supplier_id TEXT NOT NULL,
    supplier_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'needs_sync')),
    sync_error TEXT,
    credentials JSONB NOT NULL DEFAULT '{}',
    settings JSONB NOT NULL DEFAULT '{
        "auto_sync": true,
        "sync_interval": 60,
        "price_markup": 0,
        "auto_accept_bookings": false,
        "sync_availability": true,
        "sync_pricing": true
    }',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(location_id, provider)
);

-- OTA Product Mappings table (maps OTA products to local tours)
CREATE TABLE IF NOT EXISTS ota_product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES ota_connections(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    ota_product_id TEXT NOT NULL,
    ota_product_code TEXT,
    ota_product_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    pricing_override JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(connection_id, ota_product_id),
    UNIQUE(connection_id, tour_id)
);

-- OTA Commission Tracking
CREATE TABLE IF NOT EXISTS ota_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES ota_connections(id) ON DELETE CASCADE,
    ota_booking_id TEXT NOT NULL,
    gross_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 4) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    settlement_status TEXT NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled', 'disputed')),
    settlement_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTA Sync Logs
CREATE TABLE IF NOT EXISTS ota_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES ota_connections(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('bookings', 'availability', 'products')),
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    synced_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    errors JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ota_connections_location ON ota_connections(location_id);
CREATE INDEX IF NOT EXISTS idx_ota_connections_provider ON ota_connections(provider);
CREATE INDEX IF NOT EXISTS idx_ota_connections_active ON ota_connections(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ota_product_mappings_connection ON ota_product_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_ota_product_mappings_tour ON ota_product_mappings(tour_id);
CREATE INDEX IF NOT EXISTS idx_ota_product_mappings_ota_product ON ota_product_mappings(ota_product_id);

CREATE INDEX IF NOT EXISTS idx_ota_commissions_booking ON ota_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ota_commissions_connection ON ota_commissions(connection_id);
CREATE INDEX IF NOT EXISTS idx_ota_commissions_settlement ON ota_commissions(settlement_status);

CREATE INDEX IF NOT EXISTS idx_ota_sync_logs_connection ON ota_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_ota_sync_logs_started ON ota_sync_logs(started_at DESC);

-- Add external_reference and source columns to bookings if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'external_reference') THEN
        ALTER TABLE bookings ADD COLUMN external_reference TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'bookings' AND column_name = 'source') THEN
        ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'direct';
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_bookings_external_ref ON bookings(external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);

-- Function to restore availability spots (for cancellations)
CREATE OR REPLACE FUNCTION restore_availability_spots(
    p_availability_id UUID,
    p_spots INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE availabilities
    SET spots_remaining = spots_remaining + p_spots,
        updated_at = NOW()
    WHERE id = p_availability_id;
END;
$$;

-- Auto-update timestamps
CREATE TRIGGER update_ota_connections_updated_at
    BEFORE UPDATE ON ota_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ota_product_mappings_updated_at
    BEFORE UPDATE ON ota_product_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE ota_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin can manage all OTA connections
CREATE POLICY admin_ota_connections ON ota_connections
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.user_id = auth.uid()
            AND s.role = 'admin'
        )
    );

-- Location managers can view their location's connections
CREATE POLICY location_manager_ota_connections ON ota_connections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('admin', 'location_manager')
            AND (s.role = 'admin' OR s.location_id = ota_connections.location_id)
        )
    );

-- Similar policies for other tables
CREATE POLICY admin_ota_product_mappings ON ota_product_mappings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.user_id = auth.uid()
            AND s.role = 'admin'
        )
    );

CREATE POLICY admin_ota_commissions ON ota_commissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('admin', 'location_manager')
        )
    );

CREATE POLICY admin_ota_sync_logs ON ota_sync_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            WHERE s.user_id = auth.uid()
            AND s.role IN ('admin', 'location_manager')
        )
    );

-- Add comment
COMMENT ON TABLE ota_connections IS 'OTA (Online Travel Agency) integration connections for Viator, GetYourGuide, Airbnb Experiences';
