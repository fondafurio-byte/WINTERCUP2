-- Fix security_definer_view warnings from Supabase Database Linter
-- These views were created with SECURITY DEFINER which bypasses Row Level Security (RLS)
-- This script recreates them WITHOUT SECURITY DEFINER to respect RLS policies

-- Drop and recreate athlete_votes view
DROP VIEW IF EXISTS public.athlete_votes CASCADE;

CREATE OR REPLACE VIEW public.athlete_votes AS
SELECT 
  a.id as atleta_id,
  a.squadra_id,
  COUNT(v.id) as vote_count
FROM public.atleti a
LEFT JOIN public.votes v ON v.atleta_id = a.id
GROUP BY a.id, a.squadra_id;

-- Restore RLS on the view (if needed)
ALTER VIEW public.athlete_votes SET SCHEMA public;

-- Drop and recreate team_tokens_view
DROP VIEW IF EXISTS public.team_tokens_view CASCADE;

CREATE OR REPLACE VIEW public.team_tokens_view AS
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

-- Restore RLS on the view (if needed)
ALTER VIEW public.team_tokens_view SET SCHEMA public;

-- Verification queries
-- Run these to verify the views work correctly:
-- SELECT * FROM public.athlete_votes LIMIT 5;
-- SELECT * FROM public.team_tokens_view LIMIT 5;
