-- Migration: Guest No-Show and Waiver Expiration Handling

-- Function to mark guests as no-show after tour completion
CREATE OR REPLACE FUNCTION mark_no_shows()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark bookings as no-show where:
  -- 1. The availability date/time has passed
  -- 2. Guest wasn't checked in
  -- 3. Booking was confirmed
  UPDATE bookings b
  SET
    status = 'no_show',
    updated_at = NOW()
  FROM availabilities a
  WHERE b.availability_id = a.id
    AND b.status = 'confirmed'
    AND b.checked_in = false
    AND (a.date < CURRENT_DATE OR (a.date = CURRENT_DATE AND a.end_time < CURRENT_TIME))
  RETURNING b.id INTO updated_count;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Log the action
  INSERT INTO audit_logs (action, entity_type, metadata)
  VALUES ('mark_no_shows', 'booking', jsonb_build_object('updated_count', updated_count));

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to expire waivers that weren't signed before the tour
CREATE OR REPLACE FUNCTION expire_unsigned_waivers()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark waivers as expired where:
  -- 1. The associated booking's availability has passed
  -- 2. Waiver is still pending
  UPDATE waivers w
  SET
    status = 'expired'
  FROM bookings b, availabilities a
  WHERE w.booking_id = b.id
    AND b.availability_id = a.id
    AND w.status = 'pending'
    AND (a.date < CURRENT_DATE OR (a.date = CURRENT_DATE AND a.end_time < CURRENT_TIME));

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Log the action
  INSERT INTO audit_logs (action, entity_type, metadata)
  VALUES ('expire_waivers', 'waiver', jsonb_build_object('updated_count', updated_count));

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a waiver is still valid for signing
CREATE OR REPLACE FUNCTION can_sign_waiver(p_waiver_id UUID)
RETURNS TABLE(can_sign BOOLEAN, reason TEXT) AS $$
DECLARE
  v_waiver RECORD;
  v_booking RECORD;
  v_availability RECORD;
BEGIN
  -- Get waiver and related booking info
  SELECT w.*, b.status as booking_status, a.date, a.start_time
  INTO v_waiver
  FROM waivers w
  JOIN bookings b ON w.booking_id = b.id
  JOIN availabilities a ON b.availability_id = a.id
  WHERE w.id = p_waiver_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Waiver not found'::TEXT;
    RETURN;
  END IF;

  IF v_waiver.status = 'signed' THEN
    RETURN QUERY SELECT false, 'Waiver already signed'::TEXT;
    RETURN;
  END IF;

  IF v_waiver.status = 'expired' THEN
    RETURN QUERY SELECT false, 'Waiver has expired'::TEXT;
    RETURN;
  END IF;

  IF v_waiver.booking_status = 'cancelled' THEN
    RETURN QUERY SELECT false, 'Booking was cancelled'::TEXT;
    RETURN;
  END IF;

  IF v_waiver.booking_status = 'no_show' THEN
    RETURN QUERY SELECT false, 'Guest did not show up for tour'::TEXT;
    RETURN;
  END IF;

  -- Check if tour has already started
  IF v_waiver.date < CURRENT_DATE OR
     (v_waiver.date = CURRENT_DATE AND v_waiver.start_time < CURRENT_TIME) THEN
    -- Expire the waiver
    UPDATE waivers SET status = 'expired' WHERE id = p_waiver_id;
    RETURN QUERY SELECT false, 'Tour has already started'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create index for efficient no-show and expiration queries
CREATE INDEX IF NOT EXISTS idx_bookings_no_show_candidates
ON bookings (status, checked_in)
WHERE status = 'confirmed' AND checked_in = false;

CREATE INDEX IF NOT EXISTS idx_waivers_pending
ON waivers (status)
WHERE status = 'pending';

-- Add trigger to auto-complete bookings after check-in
CREATE OR REPLACE FUNCTION auto_complete_checked_in_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- If booking was checked in and tour has ended, mark as completed
  IF NEW.checked_in = true AND OLD.checked_in = false THEN
    -- Schedule for completion after tour ends (handled by cron job)
    -- For now, just log the check-in
    INSERT INTO audit_logs (action, entity_type, entity_id, metadata)
    VALUES ('check_in', 'booking', NEW.id, jsonb_build_object('checked_in_at', NEW.checked_in_at));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_check_in_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.checked_in IS DISTINCT FROM OLD.checked_in)
  EXECUTE FUNCTION auto_complete_checked_in_bookings();

-- Comments for documentation
COMMENT ON FUNCTION mark_no_shows() IS 'Run periodically to mark confirmed bookings as no-show if guest did not check in';
COMMENT ON FUNCTION expire_unsigned_waivers() IS 'Run periodically to expire waivers that were not signed before tour start';
COMMENT ON FUNCTION can_sign_waiver(UUID) IS 'Check if a waiver can still be signed, returns can_sign boolean and reason text';
