-- Affiliate System Migration
-- This migration adds support for affiliate marketing with QR codes, referral tracking, and commission management

-- 1. Add 'affiliate' to the staff role constraint
-- First, drop the existing constraint if it exists
DO $$
BEGIN
  ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint including 'affiliate' role
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('admin', 'location_manager', 'captain', 'front_desk', 'affiliate', 'manager', 'guide'));

-- 2. Create affiliate_profiles table
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  affiliate_code VARCHAR(20) UNIQUE NOT NULL,
  commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_rate DECIMAL(10, 2) DEFAULT 10.00,
  discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) DEFAULT 5.00,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_staff_id ON affiliate_profiles(staff_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_location_id ON affiliate_profiles(location_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_profiles_code ON affiliate_profiles(affiliate_code);

-- 3. Create affiliate_referrals table
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_amount DECIMAL(10, 2),
  discount_given DECIMAL(10, 2),
  commission_amount DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_booking_id ON affiliate_referrals(booking_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status ON affiliate_referrals(status);

-- 4. Add affiliate_id to bookings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'affiliate_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN affiliate_id UUID REFERENCES affiliate_profiles(id) ON DELETE SET NULL;
    CREATE INDEX idx_bookings_affiliate_id ON bookings(affiliate_id);
  END IF;
END $$;

-- 5. Create function to generate affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code(location_slug VARCHAR, staff_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  code_prefix VARCHAR(6);
  name_part VARCHAR(4);
  random_part VARCHAR(4);
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  -- Get first 3-6 chars of location slug (uppercase)
  code_prefix := UPPER(LEFT(REGEXP_REPLACE(location_slug, '[^a-zA-Z]', '', 'g'), 4));

  -- Get initials or first chars of name
  name_part := UPPER(LEFT(REGEXP_REPLACE(staff_name, '[^a-zA-Z]', '', 'g'), 2));

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

-- 6. Create function to update affiliate stats on referral changes
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update totals when new referral is added
    UPDATE affiliate_profiles
    SET
      total_bookings = total_bookings + 1,
      total_earnings = total_earnings + COALESCE(NEW.commission_amount, 0),
      updated_at = NOW()
    WHERE id = NEW.affiliate_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
      -- Subtract from totals when cancelled
      UPDATE affiliate_profiles
      SET
        total_bookings = GREATEST(total_bookings - 1, 0),
        total_earnings = GREATEST(total_earnings - COALESCE(OLD.commission_amount, 0), 0),
        updated_at = NOW()
      WHERE id = NEW.affiliate_id;
    ELSIF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
      -- Add back to totals when un-cancelled
      UPDATE affiliate_profiles
      SET
        total_bookings = total_bookings + 1,
        total_earnings = total_earnings + COALESCE(NEW.commission_amount, 0),
        updated_at = NOW()
      WHERE id = NEW.affiliate_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract from totals when deleted (only if not already cancelled)
    IF OLD.status != 'cancelled' THEN
      UPDATE affiliate_profiles
      SET
        total_bookings = GREATEST(total_bookings - 1, 0),
        total_earnings = GREATEST(total_earnings - COALESCE(OLD.commission_amount, 0), 0),
        updated_at = NOW()
      WHERE id = OLD.affiliate_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for affiliate stats
DROP TRIGGER IF EXISTS trigger_update_affiliate_stats ON affiliate_referrals;
CREATE TRIGGER trigger_update_affiliate_stats
  AFTER INSERT OR UPDATE OR DELETE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_stats();

-- 7. Enable RLS on new tables
ALTER TABLE affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for affiliate_profiles
-- Admins and location managers can view all affiliates
CREATE POLICY "Admins can manage all affiliate profiles" ON affiliate_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('admin', 'location_manager')
      AND staff.is_active = true
    )
  );

-- Affiliates can view their own profile
CREATE POLICY "Affiliates can view own profile" ON affiliate_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.id = affiliate_profiles.staff_id
      AND staff.is_active = true
    )
  );

-- 9. Create RLS policies for affiliate_referrals
-- Admins and location managers can view all referrals
CREATE POLICY "Admins can manage all referrals" ON affiliate_referrals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('admin', 'location_manager')
      AND staff.is_active = true
    )
  );

-- Affiliates can view their own referrals
CREATE POLICY "Affiliates can view own referrals" ON affiliate_referrals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN affiliate_profiles ap ON ap.staff_id = s.id
      WHERE s.user_id = auth.uid()
      AND ap.id = affiliate_referrals.affiliate_id
      AND s.is_active = true
    )
  );

-- 10. Create view for affiliate dashboard stats
CREATE OR REPLACE VIEW affiliate_dashboard_stats AS
SELECT
  ap.id AS affiliate_id,
  ap.staff_id,
  ap.location_id,
  ap.affiliate_code,
  ap.commission_type,
  ap.commission_rate,
  ap.discount_type,
  ap.discount_value,
  ap.total_earnings,
  ap.total_bookings,
  ap.is_active,
  s.name AS affiliate_name,
  s.email AS affiliate_email,
  l.name AS location_name,
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
JOIN staff s ON s.id = ap.staff_id
JOIN locations l ON l.id = ap.location_id;

COMMENT ON TABLE affiliate_profiles IS 'Stores affiliate marketing profiles linked to staff members';
COMMENT ON TABLE affiliate_referrals IS 'Tracks bookings made through affiliate referrals';
COMMENT ON COLUMN affiliate_profiles.affiliate_code IS 'Unique code used in QR codes and referral links';
COMMENT ON COLUMN affiliate_profiles.commission_type IS 'Whether commission is percentage or fixed amount';
COMMENT ON COLUMN affiliate_profiles.commission_rate IS 'Commission rate (percentage or fixed amount in dollars)';
COMMENT ON COLUMN affiliate_profiles.discount_type IS 'Whether customer discount is percentage or fixed amount';
COMMENT ON COLUMN affiliate_profiles.discount_value IS 'Discount given to customers using this affiliate code';
