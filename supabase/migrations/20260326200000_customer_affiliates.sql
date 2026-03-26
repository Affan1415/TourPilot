-- Customer Affiliates Migration
-- Every customer automatically becomes an affiliate (no discount, commission only)

-- 1. Add customer_id to affiliate_profiles to link customers directly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_profiles' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE affiliate_profiles ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
    CREATE INDEX idx_affiliate_profiles_customer_id ON affiliate_profiles(customer_id);
  END IF;
END $$;

-- 2. Make staff_id optional (since customers won't have staff records)
ALTER TABLE affiliate_profiles ALTER COLUMN staff_id DROP NOT NULL;

-- 3. Add constraint: either staff_id or customer_id must be set
ALTER TABLE affiliate_profiles DROP CONSTRAINT IF EXISTS affiliate_profiles_owner_check;
ALTER TABLE affiliate_profiles ADD CONSTRAINT affiliate_profiles_owner_check
  CHECK (staff_id IS NOT NULL OR customer_id IS NOT NULL);

-- 4. Create function to generate customer affiliate code
CREATE OR REPLACE FUNCTION generate_customer_affiliate_code(location_slug VARCHAR, customer_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  code_prefix VARCHAR(6);
  name_part VARCHAR(4);
  random_part VARCHAR(4);
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  -- Get first 3-4 chars of location slug (uppercase)
  code_prefix := UPPER(LEFT(REGEXP_REPLACE(location_slug, '[^a-zA-Z]', '', 'g'), 3));

  -- Get initials or first chars of name
  name_part := UPPER(LEFT(REGEXP_REPLACE(customer_name, '[^a-zA-Z]', '', 'g'), 3));

  -- Generate unique code
  LOOP
    random_part := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4));
    new_code := code_prefix || '-' || name_part || random_part;

    SELECT EXISTS(SELECT 1 FROM affiliate_profiles WHERE affiliate_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to auto-create affiliate profile for customer
CREATE OR REPLACE FUNCTION create_customer_affiliate(
  p_customer_id UUID,
  p_location_id UUID,
  p_customer_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
  v_affiliate_id UUID;
  v_location_slug VARCHAR;
  v_affiliate_code VARCHAR;
BEGIN
  -- Check if customer already has an affiliate profile for this location
  SELECT id INTO v_affiliate_id
  FROM affiliate_profiles
  WHERE customer_id = p_customer_id AND location_id = p_location_id;

  IF v_affiliate_id IS NOT NULL THEN
    RETURN v_affiliate_id;
  END IF;

  -- Get location slug
  SELECT COALESCE(slug, name) INTO v_location_slug
  FROM locations
  WHERE id = p_location_id;

  IF v_location_slug IS NULL THEN
    v_location_slug := 'LOC';
  END IF;

  -- Generate affiliate code
  v_affiliate_code := generate_customer_affiliate_code(v_location_slug, p_customer_name);

  -- Create affiliate profile
  INSERT INTO affiliate_profiles (
    customer_id,
    location_id,
    affiliate_code,
    commission_type,
    commission_rate,
    discount_type,
    discount_value,
    is_active
  ) VALUES (
    p_customer_id,
    p_location_id,
    v_affiliate_code,
    'percentage',
    10.00,  -- Default 10% commission
    'percentage',
    0,      -- No discount for customers referred
    true
  )
  RETURNING id INTO v_affiliate_id;

  RETURN v_affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Update RLS policy for affiliate_profiles to include customers
DROP POLICY IF EXISTS "Customers can view own affiliate profile" ON affiliate_profiles;
CREATE POLICY "Customers can view own affiliate profile" ON affiliate_profiles
  FOR SELECT
  USING (
    customer_id IN (
      SELECT c.id FROM customers c
      WHERE c.user_id = auth.uid()
    )
  );

-- 7. Update the affiliate dashboard view to include customer affiliates
DROP VIEW IF EXISTS affiliate_dashboard_stats;
CREATE OR REPLACE VIEW affiliate_dashboard_stats AS
SELECT
  ap.id AS affiliate_id,
  ap.staff_id,
  ap.customer_id,
  ap.location_id,
  ap.affiliate_code,
  ap.commission_type,
  ap.commission_rate,
  ap.discount_type,
  ap.discount_value,
  ap.total_earnings,
  ap.total_bookings,
  ap.pending_balance,
  ap.paid_balance,
  ap.is_active,
  COALESCE(s.name, CONCAT(c.first_name, ' ', c.last_name)) AS affiliate_name,
  COALESCE(s.email, c.email) AS affiliate_email,
  l.name AS location_name,
  CASE WHEN ap.staff_id IS NOT NULL THEN 'staff' ELSE 'customer' END AS affiliate_type,
  COALESCE(
    (SELECT SUM(commission_amount) FROM affiliate_referrals ar
     WHERE ar.affiliate_id = ap.id
     AND ar.status != 'cancelled'
     AND ar.created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    0
  ) AS earnings_this_month,
  COALESCE(
    (SELECT COUNT(*) FROM affiliate_referrals ar
     WHERE ar.affiliate_id = ap.id
     AND ar.status != 'cancelled'
     AND ar.created_at >= DATE_TRUNC('month', CURRENT_DATE)),
    0
  ) AS referrals_this_month,
  COALESCE(
    (SELECT SUM(commission_amount) FROM affiliate_referrals ar
     WHERE ar.affiliate_id = ap.id
     AND ar.status = 'pending'),
    0
  ) AS pending_earnings
FROM affiliate_profiles ap
LEFT JOIN staff s ON s.id = ap.staff_id
LEFT JOIN customers c ON c.id = ap.customer_id
JOIN locations l ON l.id = ap.location_id;

-- 8. Update payout stats view
DROP VIEW IF EXISTS affiliate_payout_stats;
CREATE OR REPLACE VIEW affiliate_payout_stats AS
SELECT
  ap.id AS affiliate_id,
  ap.staff_id,
  ap.customer_id,
  COALESCE(s.name, CONCAT(c.first_name, ' ', c.last_name)) AS affiliate_name,
  COALESCE(s.email, c.email) AS affiliate_email,
  ap.affiliate_code,
  ap.commission_rate,
  ap.commission_type,
  ap.total_earnings,
  ap.total_bookings,
  ap.pending_balance,
  ap.paid_balance,
  l.name AS location_name,
  l.id AS location_id,
  CASE WHEN ap.staff_id IS NOT NULL THEN 'staff' ELSE 'customer' END AS affiliate_type,
  COALESCE(
    (SELECT COUNT(*) FROM affiliate_referrals ar
     WHERE ar.affiliate_id = ap.id AND ar.status = 'confirmed'),
    0
  ) AS pending_referrals_count,
  COALESCE(
    (SELECT SUM(commission_amount) FROM affiliate_referrals ar
     WHERE ar.affiliate_id = ap.id AND ar.status = 'confirmed'),
    0
  ) AS pending_commission_total
FROM affiliate_profiles ap
LEFT JOIN staff s ON s.id = ap.staff_id
LEFT JOIN customers c ON c.id = ap.customer_id
JOIN locations l ON l.id = ap.location_id
WHERE ap.is_active = true;

COMMENT ON COLUMN affiliate_profiles.customer_id IS 'Customer ID for customer-based affiliates (every booking customer gets an affiliate code)';
