-- =============================================
-- Customer Avatar Support Migration
-- =============================================
-- Adds avatar support for customer profiles

-- Add avatar_url column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for customer avatars if it doesn't exist
-- Note: This needs to be done via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- RLS policy for avatars bucket (run in Supabase dashboard):
-- CREATE POLICY "Users can upload their own avatar"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can update their own avatar"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Avatars are publicly accessible"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'avatars');
