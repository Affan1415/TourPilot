-- User Language Preference Migration
-- Adds language preference columns to staff and customers tables

-- 1. Add language preference to staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'language'
  ) THEN
    ALTER TABLE staff ADD COLUMN language VARCHAR(10) DEFAULT 'en';
    CREATE INDEX idx_staff_language ON staff(language);
  END IF;
END $$;

-- 2. Add language preference to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'language'
  ) THEN
    ALTER TABLE customers ADD COLUMN language VARCHAR(10) DEFAULT 'en';
    CREATE INDEX idx_customers_language ON customers(language);
  END IF;
END $$;

-- 3. Add check constraint for valid language codes
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_language_check;
ALTER TABLE staff ADD CONSTRAINT staff_language_check
  CHECK (language IN ('en', 'nl', 'es', 'de', 'fr'));

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_language_check;
ALTER TABLE customers ADD CONSTRAINT customers_language_check
  CHECK (language IN ('en', 'nl', 'es', 'de', 'fr'));

COMMENT ON COLUMN staff.language IS 'Preferred language for staff member (en, nl, es, de, fr)';
COMMENT ON COLUMN customers.language IS 'Preferred language for customer communications (en, nl, es, de, fr)';
