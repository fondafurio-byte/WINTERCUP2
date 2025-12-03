-- Migration: Add test match functionality
-- Allows admins to create TEST matches visible only to rilevatori (reporters)

-- ============================================================================
-- STEP 1: Add is_test column to partite table
-- ============================================================================

ALTER TABLE public.partite
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.partite.is_test IS 'TRUE for test matches (visible only to rilevatori), FALSE for regular matches';

-- Create index for filtering test matches
CREATE INDEX IF NOT EXISTS idx_partite_is_test ON public.partite(is_test);

-- ============================================================================
-- STEP 2: Enable RLS and create policies for test matches visibility
-- ============================================================================

-- ENABLE RLS on partite table
ALTER TABLE public.partite ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "See non-test matches" ON public.partite;
DROP POLICY IF EXISTS "Rilevatori see all matches" ON public.partite;
DROP POLICY IF EXISTS "Admins can create test matches" ON public.partite;
DROP POLICY IF EXISTS "Anyone can insert" ON public.partite;
DROP POLICY IF EXISTS "Anyone can update" ON public.partite;
DROP POLICY IF EXISTS "Anyone can delete" ON public.partite;

-- Policy 1: Everyone can see non-test matches
CREATE POLICY "See non-test matches" 
ON public.partite 
FOR SELECT 
USING (is_test = FALSE);

-- Policy 2: Rilevatori can see test matches too
CREATE POLICY "Rilevatori see test matches" 
ON public.partite 
FOR SELECT 
USING (
  is_test = FALSE
  OR
  EXISTS (
    SELECT 1 FROM public.rilevatori 
    WHERE rilevatori.user_id = auth.uid()
  )
);

-- Policy 3: Admins can INSERT
CREATE POLICY "Admins can insert matches" 
ON public.partite 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.user_id = auth.uid()
  )
);

-- Policy 4: Allow UPDATE for admins and rilevatori
CREATE POLICY "Admins and rilevatori can update" 
ON public.partite 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.rilevatori 
    WHERE rilevatori.user_id = auth.uid()
  )
);

-- Policy 5: Allow DELETE for admins only
CREATE POLICY "Admins can delete matches" 
ON public.partite 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 3: Create or update view for getting matches by role
-- ============================================================================

-- This view helps the app determine which matches to show based on user role
DROP VIEW IF EXISTS public.matches_by_role CASCADE;

CREATE VIEW public.matches_by_role AS
SELECT 
  p.id,
  p.girone,
  p.home_team_id,
  p.away_team_id,
  p.campo,
  p.orario,
  p.home_score,
  p.away_score,
  p.rilevatore_id,
  p.is_test,
  -- Only show test matches to rilevatori
  CASE 
    WHEN p.is_test = TRUE THEN (
      SELECT EXISTS (
        SELECT 1 FROM public.rilevatori 
        WHERE rilevatori.user_id = auth.uid()
      )
    )
    ELSE TRUE
  END AS visible_to_user
FROM public.partite p
WHERE 
  -- Non-test matches always visible
  p.is_test = FALSE
  OR
  -- Test matches only to rilevatori
  (p.is_test = TRUE AND EXISTS (
    SELECT 1 FROM public.rilevatori 
    WHERE rilevatori.user_id = auth.uid()
  ));

GRANT SELECT ON public.matches_by_role TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 4: Add helper function to check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.user_id = COALESCE(user_id, auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 5: Add helper function to check if user is rilevatore
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_rilevatore(user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rilevatori 
    WHERE rilevatori.user_id = COALESCE(user_id, auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_rilevatore TO authenticated, anon, service_role;

-- ============================================================================
-- VERIFICATION QUERIES (uncomment to test)
-- ============================================================================

/*
-- Check if is_test column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partite' AND column_name = 'is_test';

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'partite';

-- Check the view
SELECT * FROM public.matches_by_role LIMIT 5;

-- Check helper functions exist
SELECT proname, prosecdef 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('is_admin', 'is_rilevatore');
*/
