-- Create storage bucket for team photos
-- This bucket will store team photos uploaded directly from the app

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-photos',
  'team-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view team photos (public read)
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'team-photos');

-- Allow authenticated users (admins) to upload team photos
CREATE POLICY IF NOT EXISTS "Authenticated users can upload team photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-photos');

-- Allow authenticated users (admins) to update team photos
CREATE POLICY IF NOT EXISTS "Authenticated users can update team photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'team-photos');

-- Allow authenticated users (admins) to delete team photos
CREATE POLICY IF NOT EXISTS "Authenticated users can delete team photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'team-photos');
