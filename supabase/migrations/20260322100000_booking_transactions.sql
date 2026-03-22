-- Migration: Atomic booking transactions and idempotency
-- Fixes race conditions in capacity booking and payment webhooks

-- 1. Create a function to atomically reserve capacity
-- This prevents race conditions where multiple bookings exceed capacity
CREATE OR REPLACE FUNCTION reserve_availability_capacity(
  p_availability_id UUID,
  p_guest_count INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT,
  new_booked_count INTEGER,
  status TEXT
) AS $$
DECLARE
  v_availability RECORD;
  v_max_capacity INTEGER;
  v_available_spots INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT a.*, t.max_capacity INTO v_availability
  FROM availabilities a
  JOIN tours t ON a.tour_id = t.id
  WHERE a.id = p_availability_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Availability not found'::TEXT, 0, 'error'::TEXT;
    RETURN;
  END IF;

  -- Check if already cancelled or closed
  IF v_availability.status NOT IN ('available', 'full') THEN
    RETURN QUERY SELECT FALSE, 'This time slot is no longer available'::TEXT, v_availability.booked_count, v_availability.status;
    RETURN;
  END IF;

  -- Calculate capacity
  v_max_capacity := COALESCE(v_availability.capacity_override, v_availability.max_capacity);
  v_available_spots := v_max_capacity - v_availability.booked_count;

  -- Check capacity
  IF p_guest_count > v_available_spots THEN
    RETURN QUERY SELECT FALSE, format('Only %s spots available', v_available_spots)::TEXT, v_availability.booked_count, v_availability.status;
    RETURN;
  END IF;

  -- Update the booked count atomically
  v_new_count := v_availability.booked_count + p_guest_count;

  UPDATE availabilities
  SET
    booked_count = v_new_count,
    status = CASE WHEN v_new_count >= v_max_capacity THEN 'full' ELSE 'available' END,
    updated_at = NOW()
  WHERE id = p_availability_id;

  RETURN QUERY SELECT
    TRUE,
    NULL::TEXT,
    v_new_count,
    CASE WHEN v_new_count >= v_max_capacity THEN 'full' ELSE 'available' END;
END;
$$ LANGUAGE plpgsql;

-- 2. Create a function to release capacity (for cancellations)
CREATE OR REPLACE FUNCTION release_availability_capacity(
  p_availability_id UUID,
  p_guest_count INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  new_booked_count INTEGER
) AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE availabilities
  SET
    booked_count = GREATEST(0, booked_count - p_guest_count),
    status = 'available',
    updated_at = NOW()
  WHERE id = p_availability_id
  RETURNING booked_count INTO v_new_count;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, v_new_count;
END;
$$ LANGUAGE plpgsql;

-- 3. Create payment_events table for webhook idempotency
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_stripe_id ON payment_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_booking ON payment_events(booking_id);

-- 4. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  staff_id UUID REFERENCES staff(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 5. Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_staff_id UUID,
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, staff_id, action, entity_type, entity_id,
    old_values, new_values, ip_address, user_agent, metadata
  ) VALUES (
    p_user_id, p_staff_id, p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create staff_certifications table
CREATE TABLE IF NOT EXISTS staff_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  issuing_authority VARCHAR(255),
  certification_number VARCHAR(100),
  issue_date DATE NOT NULL,
  expiry_date DATE,
  document_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending_renewal')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_certs_staff ON staff_certifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_certs_expiry ON staff_certifications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_staff_certs_status ON staff_certifications(status);

-- 7. Function to check for expiring certifications
CREATE OR REPLACE FUNCTION get_expiring_certifications(
  p_days_ahead INTEGER DEFAULT 30
) RETURNS TABLE(
  certification_id UUID,
  staff_id UUID,
  staff_name VARCHAR,
  staff_email VARCHAR,
  cert_name VARCHAR,
  expiry_date DATE,
  days_until_expiry INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.staff_id,
    s.name,
    s.email,
    sc.name,
    sc.expiry_date,
    (sc.expiry_date - CURRENT_DATE)::INTEGER
  FROM staff_certifications sc
  JOIN staff s ON sc.staff_id = s.id
  WHERE sc.status = 'active'
    AND sc.expiry_date IS NOT NULL
    AND sc.expiry_date <= CURRENT_DATE + p_days_ahead
    AND sc.expiry_date >= CURRENT_DATE
  ORDER BY sc.expiry_date;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger to auto-update certification status
CREATE OR REPLACE FUNCTION update_certification_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cert_status ON staff_certifications;
CREATE TRIGGER trigger_update_cert_status
BEFORE INSERT OR UPDATE ON staff_certifications
FOR EACH ROW
EXECUTE FUNCTION update_certification_status();

-- RLS Policies
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_certifications ENABLE ROW LEVEL SECURITY;

-- Admin can view all audit logs
CREATE POLICY "Admin can view all audit logs"
  ON audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Staff can view their location's certifications
CREATE POLICY "Staff can view certifications"
  ON staff_certifications FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM staff WHERE user_id = auth.uid() AND role IN ('admin', 'location_manager')
    )
  );

-- Managers can manage certifications
CREATE POLICY "Managers can manage certifications"
  ON staff_certifications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM staff WHERE user_id = auth.uid() AND role IN ('admin', 'location_manager')
  ));

COMMENT ON FUNCTION reserve_availability_capacity IS 'Atomically reserves capacity for a booking, preventing race conditions';
COMMENT ON FUNCTION release_availability_capacity IS 'Releases capacity when a booking is cancelled';
COMMENT ON TABLE payment_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions';
COMMENT ON TABLE staff_certifications IS 'Tracks staff certifications, licenses, and training records';
