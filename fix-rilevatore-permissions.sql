-- Fix permissions for rilevatori to update partite table
-- Execute this in Supabase SQL Editor

-- 1. Enable RLS on partite (if not already enabled)
ALTER TABLE partite ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access on partite" ON partite;
DROP POLICY IF EXISTS "Allow admin and rilevatori update on partite" ON partite;
DROP POLICY IF EXISTS "Allow admin insert on partite" ON partite;
DROP POLICY IF EXISTS "Allow admin delete on partite" ON partite;

-- 3. Create new policies

-- Everyone can read matches
CREATE POLICY "Allow public read access on partite"
  ON partite FOR SELECT
  TO public
  USING (true);

-- Admin and rilevatori can update matches (for is_live, home_score, away_score)
CREATE POLICY "Allow admin and rilevatori update on partite"
  ON partite FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM rilevatori WHERE user_id = auth.uid()
    )
  );

-- Only admin can insert new matches
CREATE POLICY "Allow admin insert on partite"
  ON partite FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

-- Only admin can delete matches
CREATE POLICY "Allow admin delete on partite"
  ON partite FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );
