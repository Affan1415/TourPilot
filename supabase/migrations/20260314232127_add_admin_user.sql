-- Add Admin User
INSERT INTO staff (user_id, email, name, role, is_active)
VALUES (
  'ef86963f-1c8a-4a10-ba17-409503674e42',
  (SELECT email FROM auth.users WHERE id = 'ef86963f-1c8a-4a10-ba17-409503674e42'),
  'Admin',
  'admin',
  true
)
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  role = 'admin',
  is_active = true;
