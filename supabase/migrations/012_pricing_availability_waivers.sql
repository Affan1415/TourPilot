-- Migration: Pricing Rules, Recurring Availability, and Waiver Enhancements
-- Adds dynamic pricing, promo codes, recurring schedules, and waiver improvements

-- ============================================
-- PRICING RULES SYSTEM
-- ============================================

-- Pricing rule types
CREATE TYPE pricing_rule_type AS ENUM (
  'seasonal',       -- Based on date range (e.g., summer premium)
  'day_of_week',    -- Based on specific days (e.g., weekend pricing)
  'time_of_day',    -- Based on tour time (e.g., sunset premium)
  'capacity',       -- Based on remaining capacity (e.g., low capacity discount)
  'early_bird',     -- Based on booking lead time (book X days ahead)
  'last_minute',    -- Last minute deals (within X hours)
  'group'           -- Group size discounts
);

-- Pricing rules table
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type pricing_rule_type NOT NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE, -- NULL = applies to all tours
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed')),
  adjustment_value DECIMAL(10, 2) NOT NULL, -- Positive = increase, Negative = discount
  conditions JSONB NOT NULL DEFAULT '{}', -- Type-specific conditions
  -- Examples:
  -- seasonal: {"months": [6, 7, 8]}
  -- day_of_week: {"days": [0, 6]} -- 0 = Sunday, 6 = Saturday
  -- time_of_day: {"after_time": "17:00"}
  -- capacity: {"min_capacity_remaining": 70} -- 70% or more empty
  -- early_bird: {"days_before": 14}
  -- last_minute: {"hours_before": 24, "min_capacity_remaining": 50}
  -- group: {"min_guests": 6}
  priority INTEGER NOT NULL DEFAULT 10, -- Lower = higher priority
  is_stackable BOOLEAN DEFAULT false, -- Can combine with other rules
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promo codes table
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_booking_value DECIMAL(10, 2), -- Minimum order amount
  max_discount DECIMAL(10, 2), -- Cap on percentage discounts
  tour_ids UUID[] DEFAULT '{}', -- Empty = all tours
  max_uses INTEGER, -- NULL = unlimited
  max_uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, code)
);

-- Promo code usage tracking
CREATE TABLE promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promo_code_id, booking_id)
);

-- Add promo_code_id to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);

-- ============================================
-- RECURRING AVAILABILITY SCHEDULES
-- ============================================

-- Recurring schedules table
CREATE TABLE recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES boats(id) ON DELETE SET NULL,
  name VARCHAR(255),
  days_of_week INTEGER[] NOT NULL, -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity_override INTEGER,
  price_override DECIMAL(10, 2),
  auto_assign_staff BOOLEAN DEFAULT false,
  staff_ids UUID[] DEFAULT '{}', -- Staff to auto-assign
  is_active BOOLEAN DEFAULT true,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE, -- NULL = indefinitely
  exclude_dates DATE[] DEFAULT '{}', -- Specific dates to skip
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated availabilities tracking (to know which were auto-generated)
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL;
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS is_manually_created BOOLEAN DEFAULT true;

-- ============================================
-- WAIVER ENHANCEMENTS
-- ============================================

-- Add location_id to waiver templates
ALTER TABLE waiver_templates ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;

-- Add tour-specific waivers
ALTER TABLE waiver_templates ADD COLUMN IF NOT EXISTS tour_ids UUID[] DEFAULT '{}'; -- Empty = all tours

-- Add language support for waivers
ALTER TABLE waiver_templates ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Waiver template versions (for audit trail)
CREATE TABLE waiver_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_template_id UUID NOT NULL REFERENCES waiver_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES staff(id),
  UNIQUE(waiver_template_id, version)
);

-- Add usage tracking to waiver templates
ALTER TABLE waiver_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE waiver_templates ADD COLUMN IF NOT EXISTS signed_count INTEGER DEFAULT 0;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_pricing_rules_location ON pricing_rules(location_id);
CREATE INDEX idx_pricing_rules_tour ON pricing_rules(tour_id);
CREATE INDEX idx_pricing_rules_type ON pricing_rules(type);
CREATE INDEX idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_rules_valid ON pricing_rules(valid_from, valid_until);

CREATE INDEX idx_promo_codes_location ON promo_codes(location_id);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active) WHERE is_active = true;
CREATE INDEX idx_promo_codes_valid ON promo_codes(valid_from, valid_until);

CREATE INDEX idx_promo_code_uses_promo ON promo_code_uses(promo_code_id);
CREATE INDEX idx_promo_code_uses_customer ON promo_code_uses(customer_id);
CREATE INDEX idx_promo_code_uses_booking ON promo_code_uses(booking_id);

CREATE INDEX idx_recurring_schedules_location ON recurring_schedules(location_id);
CREATE INDEX idx_recurring_schedules_tour ON recurring_schedules(tour_id);
CREATE INDEX idx_recurring_schedules_active ON recurring_schedules(is_active) WHERE is_active = true;

CREATE INDEX idx_availabilities_recurring ON availabilities(recurring_schedule_id);

CREATE INDEX idx_waiver_templates_location ON waiver_templates(location_id);
CREATE INDEX idx_waiver_template_versions_template ON waiver_template_versions(waiver_template_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate final price with pricing rules
CREATE OR REPLACE FUNCTION calculate_tour_price(
  p_tour_id UUID,
  p_date DATE,
  p_time TIME,
  p_guest_count INTEGER,
  p_days_before_booking INTEGER DEFAULT 0
)
RETURNS TABLE(
  base_price DECIMAL,
  final_price DECIMAL,
  applied_rules JSONB
) AS $$
DECLARE
  v_base_price DECIMAL;
  v_final_price DECIMAL;
  v_adjustment DECIMAL;
  v_applied_rules JSONB := '[]'::JSONB;
  v_rule RECORD;
  v_day_of_week INTEGER;
  v_location_id UUID;
BEGIN
  -- Get base price and location
  SELECT t.base_price, t.location_id INTO v_base_price, v_location_id
  FROM tours t WHERE t.id = p_tour_id;

  v_final_price := v_base_price;
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

  -- Apply pricing rules in priority order
  FOR v_rule IN
    SELECT * FROM pricing_rules
    WHERE is_active = true
      AND (location_id = v_location_id OR location_id IS NULL)
      AND (tour_id = p_tour_id OR tour_id IS NULL)
      AND (valid_from IS NULL OR p_date >= valid_from)
      AND (valid_until IS NULL OR p_date <= valid_until)
    ORDER BY priority ASC
  LOOP
    v_adjustment := 0;

    -- Check conditions based on rule type
    CASE v_rule.type
      WHEN 'seasonal' THEN
        IF EXTRACT(MONTH FROM p_date)::INTEGER = ANY(
          (SELECT array_agg(x::INTEGER) FROM jsonb_array_elements_text(v_rule.conditions->'months') x)
        ) THEN
          IF v_rule.adjustment_type = 'percentage' THEN
            v_adjustment := v_final_price * (v_rule.adjustment_value / 100);
          ELSE
            v_adjustment := v_rule.adjustment_value;
          END IF;
        END IF;

      WHEN 'day_of_week' THEN
        IF v_day_of_week = ANY(
          (SELECT array_agg(x::INTEGER) FROM jsonb_array_elements_text(v_rule.conditions->'days') x)
        ) THEN
          IF v_rule.adjustment_type = 'percentage' THEN
            v_adjustment := v_final_price * (v_rule.adjustment_value / 100);
          ELSE
            v_adjustment := v_rule.adjustment_value;
          END IF;
        END IF;

      WHEN 'time_of_day' THEN
        IF p_time >= (v_rule.conditions->>'after_time')::TIME THEN
          IF v_rule.adjustment_type = 'percentage' THEN
            v_adjustment := v_final_price * (v_rule.adjustment_value / 100);
          ELSE
            v_adjustment := v_rule.adjustment_value;
          END IF;
        END IF;

      WHEN 'early_bird' THEN
        IF p_days_before_booking >= (v_rule.conditions->>'days_before')::INTEGER THEN
          IF v_rule.adjustment_type = 'percentage' THEN
            v_adjustment := v_final_price * (v_rule.adjustment_value / 100);
          ELSE
            v_adjustment := v_rule.adjustment_value;
          END IF;
        END IF;

      WHEN 'group' THEN
        IF p_guest_count >= (v_rule.conditions->>'min_guests')::INTEGER THEN
          IF v_rule.adjustment_type = 'percentage' THEN
            v_adjustment := v_final_price * (v_rule.adjustment_value / 100);
          ELSE
            v_adjustment := v_rule.adjustment_value;
          END IF;
        END IF;

      ELSE
        -- Other types handled at application level (need runtime data)
        NULL;
    END CASE;

    -- Apply adjustment
    IF v_adjustment != 0 THEN
      v_final_price := v_final_price + v_adjustment;
      v_applied_rules := v_applied_rules || jsonb_build_object(
        'rule_id', v_rule.id,
        'rule_name', v_rule.name,
        'adjustment', v_adjustment
      );

      -- Exit if rule is not stackable
      IF NOT v_rule.is_stackable THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;

  -- Ensure price doesn't go negative
  IF v_final_price < 0 THEN
    v_final_price := 0;
  END IF;

  RETURN QUERY SELECT v_base_price, v_final_price, v_applied_rules;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and apply promo code
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR,
  p_location_id UUID,
  p_customer_id UUID,
  p_tour_id UUID,
  p_booking_value DECIMAL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  promo_code_id UUID,
  discount_amount DECIMAL,
  error_message TEXT
) AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_customer_uses INTEGER;
  v_discount DECIMAL;
BEGIN
  -- Find promo code
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND (location_id = p_location_id OR location_id IS NULL)
    AND is_active = true
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW());

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'Invalid or expired promo code';
    RETURN;
  END IF;

  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'Promo code has reached maximum uses';
    RETURN;
  END IF;

  -- Check customer usage limit
  SELECT COUNT(*) INTO v_customer_uses
  FROM promo_code_uses
  WHERE promo_code_id = v_promo.id AND customer_id = p_customer_id;

  IF v_customer_uses >= v_promo.max_uses_per_customer THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'You have already used this promo code';
    RETURN;
  END IF;

  -- Check minimum booking value
  IF v_promo.min_booking_value IS NOT NULL AND p_booking_value < v_promo.min_booking_value THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL,
      'Minimum order amount of $' || v_promo.min_booking_value || ' required';
    RETURN;
  END IF;

  -- Check tour eligibility
  IF array_length(v_promo.tour_ids, 1) > 0 AND NOT (p_tour_id = ANY(v_promo.tour_ids)) THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'Promo code not valid for this tour';
    RETURN;
  END IF;

  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := p_booking_value * (v_promo.discount_value / 100);
    IF v_promo.max_discount IS NOT NULL AND v_discount > v_promo.max_discount THEN
      v_discount := v_promo.max_discount;
    END IF;
  ELSE
    v_discount := v_promo.discount_value;
  END IF;

  -- Don't allow discount greater than booking value
  IF v_discount > p_booking_value THEN
    v_discount := p_booking_value;
  END IF;

  RETURN QUERY SELECT true, v_promo.id, v_discount, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to generate availabilities from recurring schedule
CREATE OR REPLACE FUNCTION generate_recurring_availabilities(
  p_schedule_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_schedule recurring_schedules%ROWTYPE;
  v_current_date DATE;
  v_day_of_week INTEGER;
  v_count INTEGER := 0;
  v_tour tours%ROWTYPE;
BEGIN
  SELECT * INTO v_schedule FROM recurring_schedules WHERE id = p_schedule_id;

  IF NOT FOUND OR NOT v_schedule.is_active THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_tour FROM tours WHERE id = v_schedule.tour_id;

  v_current_date := GREATEST(p_start_date, v_schedule.valid_from);

  WHILE v_current_date <= LEAST(p_end_date, COALESCE(v_schedule.valid_until, p_end_date)) LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;

    -- Check if this day is in the schedule and not excluded
    IF v_day_of_week = ANY(v_schedule.days_of_week)
       AND NOT (v_current_date = ANY(v_schedule.exclude_dates)) THEN

      -- Insert if doesn't exist
      INSERT INTO availabilities (
        tour_id,
        boat_id,
        date,
        start_time,
        end_time,
        capacity_override,
        price_override,
        recurring_schedule_id,
        is_manually_created,
        status
      )
      SELECT
        v_schedule.tour_id,
        v_schedule.boat_id,
        v_current_date,
        v_schedule.start_time,
        v_schedule.end_time,
        v_schedule.capacity_override,
        v_schedule.price_override,
        v_schedule.id,
        false,
        'available'
      WHERE NOT EXISTS (
        SELECT 1 FROM availabilities
        WHERE tour_id = v_schedule.tour_id
          AND date = v_current_date
          AND start_time = v_schedule.start_time
      );

      IF FOUND THEN
        v_count := v_count + 1;
      END IF;
    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update promo code usage count
CREATE OR REPLACE FUNCTION update_promo_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE promo_codes
    SET current_uses = current_uses + 1
    WHERE id = NEW.promo_code_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE promo_codes
    SET current_uses = current_uses - 1
    WHERE id = OLD.promo_code_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promo_usage
AFTER INSERT OR DELETE ON promo_code_uses
FOR EACH ROW EXECUTE FUNCTION update_promo_usage();

-- Function to update waiver template stats
CREATE OR REPLACE FUNCTION update_waiver_template_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE waiver_templates
    SET usage_count = usage_count + 1
    WHERE id = NEW.waiver_template_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status != 'signed' AND NEW.status = 'signed' THEN
    UPDATE waiver_templates
    SET signed_count = signed_count + 1
    WHERE id = NEW.waiver_template_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waiver_stats
AFTER INSERT OR UPDATE ON waivers
FOR EACH ROW EXECUTE FUNCTION update_waiver_template_stats();

-- Updated_at triggers
CREATE TRIGGER pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER recurring_schedules_updated_at
  BEFORE UPDATE ON recurring_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiver_template_versions ENABLE ROW LEVEL SECURITY;

-- Pricing rules policies
CREATE POLICY "Staff can view pricing rules"
  ON pricing_rules FOR SELECT
  USING (
    location_id IN (SELECT location_id FROM staff WHERE user_id = auth.uid())
    OR location_id IS NULL
  );

CREATE POLICY "Admin/Manager can manage pricing rules"
  ON pricing_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'location_admin')
        AND (location_id = pricing_rules.location_id OR pricing_rules.location_id IS NULL)
    )
  );

-- Promo codes policies
CREATE POLICY "Staff can view promo codes"
  ON promo_codes FOR SELECT
  USING (
    location_id IN (SELECT location_id FROM staff WHERE user_id = auth.uid())
    OR location_id IS NULL
  );

CREATE POLICY "Admin/Manager can manage promo codes"
  ON promo_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'location_admin')
        AND (location_id = promo_codes.location_id OR promo_codes.location_id IS NULL)
    )
  );

-- Promo code uses - staff can view, system can insert
CREATE POLICY "Staff can view promo code uses"
  ON promo_code_uses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert promo code uses"
  ON promo_code_uses FOR INSERT
  WITH CHECK (true);

-- Recurring schedules policies
CREATE POLICY "Staff can view recurring schedules"
  ON recurring_schedules FOR SELECT
  USING (
    location_id IN (SELECT location_id FROM staff WHERE user_id = auth.uid())
    OR location_id IS NULL
  );

CREATE POLICY "Admin/Manager can manage recurring schedules"
  ON recurring_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'location_admin')
        AND (location_id = recurring_schedules.location_id OR recurring_schedules.location_id IS NULL)
    )
  );

-- Waiver template versions policies
CREATE POLICY "Staff can view waiver versions"
  ON waiver_template_versions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin/Manager can manage waiver versions"
  ON waiver_template_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager', 'location_admin')
    )
  );

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Insert default pricing rules
INSERT INTO pricing_rules (name, description, type, adjustment_type, adjustment_value, conditions, priority, is_active) VALUES
('Weekend Premium', 'Higher prices on weekends', 'day_of_week', 'percentage', 15, '{"days": [0, 6]}', 1, true),
('Early Bird Discount', '10% off for booking 14+ days ahead', 'early_bird', 'percentage', -10, '{"days_before": 14}', 2, true),
('Group Discount', '10% off for groups of 6+', 'group', 'percentage', -10, '{"min_guests": 6}', 3, true);

-- Insert sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, valid_from) VALUES
('WELCOME10', 'New customer welcome discount', 'percentage', 10, NULL, NOW()),
('SUMMER24', 'Summer 2024 promotion', 'percentage', 15, 500, NOW());
