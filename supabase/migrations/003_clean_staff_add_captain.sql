-- =============================================
-- Clean Staff Table and Set Up User Roles
-- =============================================

-- Delete all existing staff records
DELETE FROM staff;

-- Add Admin user (Affan Zahir)
INSERT INTO staff (user_id, email, name, role, is_active)
VALUES (
  '3947f7ab-4f53-458f-9e06-5c9c01b60bb1',
  'affanzahir26@gmail.com',
  'Affan Zahir',
  'admin',
  true
);

-- Add Captain user (growtk.co)
INSERT INTO staff (user_id, email, name, role, is_active)
VALUES (
  'bf2bbf67-dd8d-499c-914d-50186a2cb2cb',
  'growtk.co@gmail.com',
  'Captain',
  'captain',
  true
);

-- Link jazz user as customer (update customers table)
-- First ensure the customer record exists and is linked
INSERT INTO customers (user_id, email, first_name, last_name, phone)
VALUES (
  '0587c031-5198-42da-87fc-9d957e06f27b',
  'affanzahir27@gmail.com',
  'jazz',
  'User',
  ''
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name;
