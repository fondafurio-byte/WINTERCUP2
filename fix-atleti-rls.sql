-- Fix RLS policies for atleti table to resolve 403 errors
-- This script ensures that the atleti table has proper read access for all users

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access on atleti" ON atleti;
DROP POLICY IF EXISTS "Authenticated users can read atleti" ON atleti;
DROP POLICY IF EXISTS "Public read access on atleti" ON atleti;

-- Enable RLS (should already be enabled)
ALTER TABLE atleti ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for SELECT that allows:
-- 1. Anonymous users (public)
-- 2. Authenticated users
CREATE POLICY "Everyone can read atleti"
  ON atleti
  FOR SELECT
  USING (true);

-- Verify admin policies still exist for INSERT/UPDATE/DELETE
-- If they don't exist, create them

-- Admin insert policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'atleti' 
    AND policyname = 'Allow admin insert on atleti'
  ) THEN
    CREATE POLICY "Allow admin insert on atleti"
      ON atleti FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM admins 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admin update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'atleti' 
    AND policyname = 'Allow admin update on atleti'
  ) THEN
    CREATE POLICY "Allow admin update on atleti"
      ON atleti FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admins 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admin delete policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'atleti' 
    AND policyname = 'Allow admin delete on atleti'
  ) THEN
    CREATE POLICY "Allow admin delete on atleti"
      ON atleti FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admins 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Team user update policy (allows team users to edit their own athletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'atleti' 
    AND policyname = 'Team users can update their own atleti'
  ) THEN
    CREATE POLICY "Team users can update their own atleti"
      ON atleti FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE user_id = auth.uid() 
          AND squadra_id = atleti.squadra_id
        )
      );
  END IF;
END $$;

-- Team user insert policy (allows team users to add athletes to their team)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'atleti' 
    AND policyname = 'Team users can insert their own atleti'
  ) THEN
    CREATE POLICY "Team users can insert their own atleti"
      ON atleti FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users 
          WHERE user_id = auth.uid() 
          AND squadra_id = atleti.squadra_id
        )
      );
  END IF;
END $$;

-- Team user delete policy (allows team users to delete their own athletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'atleti' 
    AND policyname = 'Team users can delete their own atleti'
  ) THEN
    CREATE POLICY "Team users can delete their own atleti"
      ON atleti FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE user_id = auth.uid() 
          AND squadra_id = atleti.squadra_id
        )
      );
  END IF;
END $$;
