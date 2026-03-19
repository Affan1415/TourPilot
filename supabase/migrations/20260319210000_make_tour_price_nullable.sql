-- Migration: Make tour base_price nullable
-- Description: Since prices are set per slot/boat, the base_price on tours should be optional

-- Make base_price nullable with a default of 0
ALTER TABLE tours ALTER COLUMN base_price DROP NOT NULL;
ALTER TABLE tours ALTER COLUMN base_price SET DEFAULT 0;

-- max_capacity already has a default of 10, just make it nullable too
ALTER TABLE tours ALTER COLUMN max_capacity DROP NOT NULL;
