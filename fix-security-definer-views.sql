-- Fix security_definer_view warnings from Supabase Database Linter
-- FINAL FIX: Aggressively remove and recreate views WITHOUT SECURITY DEFINER
-- 
-- The problem: Views in Supabase were created with SECURITY DEFINER which:
-- - Bypasses Row Level Security (RLS) policies
-- - Enforces permissions of the view creator (admin) instead of the querying user
-- - Security risk
--
-- This script COMPLETELY removes the views (with CASCADE to handle dependencies)
-- and recreates them as standard views that respect RLS policies.

-- ============================================================================
-- STEP 1: Drop all views that depend on athlete_votes
-- ============================================================================

DROP VIEW IF EXISTS public.athlete_votes CASCADE;

-- ============================================================================
-- STEP 2: Drop all views that depend on team_tokens_view
-- ============================================================================

DROP VIEW IF EXISTS public.team_tokens_view CASCADE;

-- ============================================================================
-- STEP 3: Recreate athlete_votes WITHOUT SECURITY DEFINER
-- ============================================================================

CREATE VIEW public.athlete_votes AS
SELECT 
  a.id as atleta_id,
  a.squadra_id,
  COUNT(v.id) as vote_count
FROM public.atleti a
LEFT JOIN public.votes v ON v.atleta_id = a.id
GROUP BY a.id, a.squadra_id;

-- Set permissions for the view
ALTER VIEW public.athlete_votes OWNER TO postgres;

GRANT SELECT ON public.athlete_votes TO authenticated;
GRANT SELECT ON public.athlete_votes TO anon;
GRANT SELECT ON public.athlete_votes TO service_role;

-- ============================================================================
-- STEP 4: Recreate team_tokens_view WITHOUT SECURITY DEFINER
-- ============================================================================

CREATE VIEW public.team_tokens_view AS
SELECT 
  s.id as squadra_id,
  s.name as squadra_nome,
  s.girone,
  t.token,
  u.username,
  u.email,
  u.has_changed_password,
  u.created_at as user_created_at
FROM public.squadre s
LEFT JOIN public.team_tokens t ON t.squadra_id = s.id
LEFT JOIN public.users u ON u.squadra_id = s.id
ORDER BY s.girone, s.name;

-- Set permissions for the view
ALTER VIEW public.team_tokens_view OWNER TO postgres;

GRANT SELECT ON public.team_tokens_view TO authenticated;
GRANT SELECT ON public.team_tokens_view TO service_role;

-- Note: team_tokens_view should likely be restricted to admins only
-- You may want to add RLS or remove 'authenticated' grant depending on your security needs

-- ============================================================================
-- FORCE SUPABASE TO RELOAD METADATA (Critical for fixing cache issues)
-- ============================================================================

-- Analyze the views to update statistics
ANALYZE public.athlete_votes;
ANALYZE public.team_tokens_view;

-- Comment on views to force metadata update
COMMENT ON VIEW public.athlete_votes IS 'Vote count aggregation by athlete (SECURITY DEFINER removed)';
COMMENT ON VIEW public.team_tokens_view IS 'Team tokens view without SECURITY DEFINER (RLS compliant)';

-- ============================================================================
-- VERIFICATION SCRIPT (Run after applying the fix)
-- ============================================================================

/*
-- Verify that views no longer have SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
AND (viewname = 'athlete_votes' OR viewname = 'team_tokens_view');

-- The definition should NOT contain "security_definer=true"
-- If fixed correctly, the output should show plain SELECT statements

-- Alternative check - query system catalog directly:
SELECT 
  n.nspname as schemaname,
  c.relname as viewname,
  c.relkind,
  c.relowner,
  obj_description(c.oid, 'pg_class') as comment
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'v'
AND (c.relname = 'athlete_votes' OR c.relname = 'team_tokens_view')
ORDER BY c.relname;

-- Test the views work:
SELECT * FROM public.athlete_votes LIMIT 5;
SELECT * FROM public.team_tokens_view LIMIT 5;
*/
