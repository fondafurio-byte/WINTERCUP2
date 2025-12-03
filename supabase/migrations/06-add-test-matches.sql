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
-- STEP 2: Create RLS policy for test matches visibility
-- ============================================================================

-- First, check if RLS is enabled on partite table (might not be)
-- ALTER TABLE public.partite ENABLE ROW LEVEL SECURITY;

-- Policy: Regular users see only non-test matches
CREATE POLICY IF NOT EXISTS "See non-test matches" 
ON public.partite 
FOR SELECT 
USING (is_test = FALSE);

-- Policy: Rilevatori (reporters) can see all matches including test matches
-- Assumes rilevatori have a role or are identified in a rilevatori table
CREATE POLICY IF NOT EXISTS "Rilevatori see all matches" 
ON public.partite 
FOR SELECT 
USING (
  -- Check if current user is a rilevatore
  EXISTS (
    SELECT 1 FROM public.rilevatori 
    WHERE rilevatori.user_id = auth.uid()
  )
  OR is_test = FALSE  -- Non-rilevatori see non-test matches
);

-- Policy: Admins can create test matches
CREATE POLICY IF NOT EXISTS "Admins can create test matches" 
ON public.partite 
FOR INSERT 
WITH CHECK (
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
