-- Create home-carousel storage bucket for home page carousel images
-- This script creates a public bucket with size limits and proper permissions

-- Drop existing bucket if exists (for re-running script)
DELETE FROM storage.buckets WHERE id = 'home-carousel';

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'home-carousel',
  'home-carousel',
  true,  -- Public bucket (images are publicly accessible)
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access for home carousel" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload for home carousel" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete for home carousel" ON storage.objects;

-- Allow public read access to home-carousel bucket
CREATE POLICY "Public read access for home carousel"
ON storage.objects FOR SELECT
USING (bucket_id = 'home-carousel');

-- Allow authenticated users (admin) to upload
CREATE POLICY "Admin upload for home carousel"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'home-carousel' 
  AND auth.uid() IN (
    SELECT user_id FROM admins
  )
);

-- Allow authenticated users (admin) to delete
CREATE POLICY "Admin delete for home carousel"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'home-carousel' 
  AND auth.uid() IN (
    SELECT user_id FROM admins
  )
);
