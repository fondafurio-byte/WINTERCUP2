-- Reset token squadre e stato login
-- Questo script genera nuovi token per tutte le squadre e resetta lo stato di primo login

-- 1. Elimina tutti i token esistenti
DELETE FROM public.team_tokens;

-- 2. Elimina tutti gli utenti di tipo 'team' (non i public users)
DELETE FROM public.users WHERE user_type = 'team' OR user_type IS NULL;

-- 3. Ricrea record users per ogni squadra (senza user_id = primo login)
INSERT INTO public.users (squadra_id, username, email, user_type, display_name, has_changed_password)
SELECT 
  id,
  lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')),  -- username: nome senza spazi/caratteri speciali
  lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) || '@wintercup.local',  -- email fittizia
  'team',
  name,  -- display_name = nome completo squadra
  false
FROM public.squadre
ORDER BY name;

-- 5. Genera nuovi token per tutte le squadre esistenti
INSERT INTO public.team_tokens (squadra_id, token)
SELECT 
  id,
  upper(substring(md5(random()::text || clock_timestamp()::text || id::text) from 1 for 8))
FROM public.squadre
ORDER BY name;

-- 6. Verifica risultati - mostra tutte le squadre con username e token
SELECT 
  s.name as squadra,
  s.girone,
  u.username,
  t.token,
  CASE 
    WHEN u.user_id IS NOT NULL THEN '✓ Ha fatto login' 
    WHEN u.id IS NOT NULL THEN '⏳ Primo login' 
    ELSE '✗ Errore setup' 
  END as stato_login,
  CASE WHEN s.logo_url IS NOT NULL THEN '✓' ELSE '✗' END as logo
FROM public.squadre s
LEFT JOIN public.team_tokens t ON s.id = t.squadra_id
LEFT JOIN public.users u ON s.id = u.squadra_id
ORDER BY s.girone, s.name;

-- 7. Statistiche finali
SELECT 
  'Totale squadre' as descrizione,
  COUNT(*) as conteggio
FROM public.squadre
UNION ALL
SELECT 
  'Token generati',
  COUNT(*)
FROM public.team_tokens
UNION ALL
SELECT 
  'Squadre Girone A',
  COUNT(*)
FROM public.squadre WHERE girone = 'A'
UNION ALL
SELECT 
  'Squadre Girone B',
  COUNT(*)
FROM public.squadre WHERE girone = 'B'
UNION ALL
SELECT 
  'Utenti team creati',
  COUNT(*)
FROM public.users WHERE user_type = 'team';
