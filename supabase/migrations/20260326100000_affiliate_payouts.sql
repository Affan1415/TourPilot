-- Affiliate Payouts Migration
-- Adds payout tracking for affiliate commissions

-- 1. Create affiliate_payouts table
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payout_method VARCHAR(50) DEFAULT 'bank_transfer',
  payout_reference VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_requested_at ON affiliate_payouts(requested_at);

-- 2. Add payout tracking columns to affiliate_referrals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_referrals' AND column_name = 'payout_id'
  ) THEN
    ALTER TABLE affiliate_referrals ADD COLUMN payout_id UUID REFERENCES affiliate_payouts(id) ON DELETE SET NULL;
    CREATE INDEX idx_affiliate_referrals_payout_id ON affiliate_referrals(payout_id);
  END IF;
END $$;

-- 3. Add pending_balance and paid_balance to affiliate_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_profiles' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE affiliate_profiles ADD COLUMN pending_balance DECIMAL(10, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'affiliate_profiles' AND column_name = 'paid_balance'
  ) THEN
    ALTER TABLE affiliate_profiles ADD COLUMN paid_balance DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- 4. Update default discount_value to 0 (no customer discount)
ALTER TABLE affiliate_profiles ALTER COLUMN discount_value SET DEFAULT 0;

-- 5. Create function to update affiliate balances when referral status changes
CREATE OR REPLACE FUNCTION update_affiliate_balances()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add to pending balance when new confirmed referral
    IF NEW.status = 'confirmed' THEN
      UPDATE affiliate_profiles
      SET pending_balance = pending_balance + COALESCE(NEW.commission_amount, 0),
          updated_at = NOW()
      WHERE id = NEW.affiliate_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status transitions
    IF OLD.status != NEW.status THEN
      -- From pending/confirmed to paid
      IF NEW.status = 'paid' AND OLD.status IN ('pending', 'confirmed') THEN
        UPDATE affiliate_profiles
        SET pending_balance = GREATEST(pending_balance - COALESCE(OLD.commission_amount, 0), 0),
            paid_balance = paid_balance + COALESCE(OLD.commission_amount, 0),
            updated_at = NOW()
        WHERE id = NEW.affiliate_id;
      -- From confirmed to cancelled
      ELSIF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
        UPDATE affiliate_profiles
        SET pending_balance = GREATEST(pending_balance - COALESCE(OLD.commission_amount, 0), 0),
            updated_at = NOW()
        WHERE id = NEW.affiliate_id;
      -- From pending to confirmed
      ELSIF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        UPDATE affiliate_profiles
        SET pending_balance = pending_balance + COALESCE(NEW.commission_amount, 0),
            updated_at = NOW()
        WHERE id = NEW.affiliate_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance updates
DROP TRIGGER IF EXISTS trigger_update_affiliate_balances ON affiliate_referrals;
CREATE TRIGGER trigger_update_affiliate_balances
  AFTER INSERT OR UPDATE ON affiliate_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_balances();

-- 6. Enable RLS on affiliate_payouts
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for affiliate_payouts
-- Admins and location managers can manage all payouts
CREATE POLICY "Admins can manage all payouts" ON affiliate_payouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('admin', 'location_manager')
      AND staff.is_active = true
    )
  );

-- Affiliates can view their own payouts
CREATE POLICY "Affiliates can view own payouts" ON affiliate_payouts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      JOIN affiliate_profiles ap ON ap.staff_id = s.id
      WHERE s.user_id = auth.uid()
      AND ap.id = affiliate_payouts.affiliate_id
      AND s.is_active = true
    )
  );

-- 8. Create view for payout dashboard stats
CREATE OR REPLACE VIEW affiliate_payout_stats AS
SELECT
  ap.id AS affiliate_id,
  ap.staff_id,
  s.name AS affiliate_name,
  s.email AS affiliate_email,
  ap.affiliate_code,
  ap.commission_rate,
  ap.commission_type,
  ap.total_earnings,
  ap.total_bookings,
  ap.pending_balance,
  ap.paid_balance,
  l.name AS location_name,
  l.id AS location_id,
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
JOIN staff s ON s.id = ap.staff_id
JOIN locations l ON l.id = ap.location_id
WHERE ap.is_active = true;

COMMENT ON TABLE affiliate_payouts IS 'Tracks affiliate commission payouts';
COMMENT ON COLUMN affiliate_payouts.payout_method IS 'Method of payment: bank_transfer, paypal, check, cash, etc.';
COMMENT ON COLUMN affiliate_payouts.payout_reference IS 'External reference number (bank transaction ID, PayPal ID, etc.)';
