-- Crea partite finali di esempio per testare il sistema di votazione MVP
-- NOTA: Esegui questo script DOPO aver:
-- 1. Creato le squadre nel database
-- 2. Popolato le classifiche dei gironi
-- 3. Eseguito la migrazione 04-add-final-type-to-votes.sql

-- IMPORTANTE: Sostituisci gli UUID delle squadre con quelli reali del tuo database
-- Puoi trovare gli UUID eseguendo: SELECT id, name, girone FROM squadre ORDER BY girone, name;

-- Esempio di struttura per le finali:
-- Finale 1°/2° Posto: 1° Girone A vs 1° Girone B
-- Finale 3°/4° Posto: 2° Girone A vs 2° Girone B
-- Finale 5°/6° Posto: 3° Girone A vs 3° Girone B
-- Finale 7°/8° Posto: 4° Girone A vs 4° Girone B (se esistono squadre in quarta posizione)

-- STEP 1: Trova gli UUID delle squadre
-- Esegui questa query per vedere le tue squadre:
-- SELECT id, name, girone FROM squadre ORDER BY girone, name;

-- STEP 2: Inserisci le partite finali
-- Sostituisci i placeholder UUID con gli UUID reali delle squadre classificate

-- Finale 1°/2° Posto (Oro)
INSERT INTO partite (
  home_team_id,
  away_team_id,
  campo,
  orario,
  girone,
  fase,
  home_score,
  away_score
) VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID, -- Sostituisci con UUID 1° Girone A
  '00000000-0000-0000-0000-000000000002'::UUID, -- Sostituisci con UUID 1° Girone B
  'Campo Centrale',
  '2025-11-30 15:00:00+00'::TIMESTAMPTZ,
  NULL, -- Le finali non hanno girone
  'finali',
  NULL, -- Punteggio da compilare
  NULL
) ON CONFLICT DO NOTHING;

-- Finale 3°/4° Posto (Bronzo)
INSERT INTO partite (
  home_team_id,
  away_team_id,
  campo,
  orario,
  girone,
  fase,
  home_score,
  away_score
) VALUES (
  '00000000-0000-0000-0000-000000000003'::UUID, -- Sostituisci con UUID 2° Girone A
  '00000000-0000-0000-0000-000000000004'::UUID, -- Sostituisci con UUID 2° Girone B
  'Campo Centrale',
  '2025-11-30 13:30:00+00'::TIMESTAMPTZ,
  NULL,
  'finali',
  NULL,
  NULL
) ON CONFLICT DO NOTHING;

-- Finale 5°/6° Posto
INSERT INTO partite (
  home_team_id,
  away_team_id,
  campo,
  orario,
  girone,
  fase,
  home_score,
  away_score
) VALUES (
  '00000000-0000-0000-0000-000000000005'::UUID, -- Sostituisci con UUID 3° Girone A
  '00000000-0000-0000-0000-000000000006'::UUID, -- Sostituisci con UUID 3° Girone B
  'Campo Laterale',
  '2025-11-30 12:00:00+00'::TIMESTAMPTZ,
  NULL,
  'finali',
  NULL,
  NULL
) ON CONFLICT DO NOTHING;

-- Finale 7°/8° Posto
INSERT INTO partite (
  home_team_id,
  away_team_id,
  campo,
  orario,
  girone,
  fase,
  home_score,
  away_score
) VALUES (
  '00000000-0000-0000-0000-000000000007'::UUID, -- Sostituisci con UUID 4° Girone A
  '00000000-0000-0000-0000-000000000008'::UUID, -- Sostituisci con UUID 4° Girone B
  'Campo Laterale',
  '2025-11-30 10:30:00+00'::TIMESTAMPTZ,
  NULL,
  'finali',
  NULL,
  NULL
) ON CONFLICT DO NOTHING;

-- Verifica le partite create
SELECT 
  p.id,
  h.name as home_team,
  a.name as away_team,
  p.campo,
  p.orario,
  p.fase,
  p.home_score,
  p.away_score
FROM partite p
JOIN squadre h ON p.home_team_id = h.id
JOIN squadre a ON p.away_team_id = a.id
WHERE p.fase = 'finali'
ORDER BY p.orario DESC;

-- Query helper per trovare le squadre classificate
-- Decommenta ed esegui per vedere le classifiche attuali:
/*
WITH classifica_a AS (
  SELECT 
    s.id,
    s.name,
    'A' as girone,
    COUNT(DISTINCT p.id) as partite_giocate,
    SUM(CASE 
      WHEN p.home_team_id = s.id AND p.home_score > p.away_score THEN 3
      WHEN p.away_team_id = s.id AND p.away_score > p.home_score THEN 3
      WHEN p.home_score = p.away_score THEN 1
      ELSE 0
    END) as punti
  FROM squadre s
  LEFT JOIN partite p ON (p.home_team_id = s.id OR p.away_team_id = s.id) 
    AND p.girone = 'A' 
    AND p.home_score IS NOT NULL
  WHERE s.girone = 'A'
  GROUP BY s.id, s.name
  ORDER BY punti DESC, s.name
),
classifica_b AS (
  SELECT 
    s.id,
    s.name,
    'B' as girone,
    COUNT(DISTINCT p.id) as partite_giocate,
    SUM(CASE 
      WHEN p.home_team_id = s.id AND p.home_score > p.away_score THEN 3
      WHEN p.away_team_id = s.id AND p.away_score > p.home_score THEN 3
      WHEN p.home_score = p.away_score THEN 1
      ELSE 0
    END) as punti
  FROM squadre s
  LEFT JOIN partite p ON (p.home_team_id = s.id OR p.away_team_id = s.id) 
    AND p.girone = 'B' 
    AND p.home_score IS NOT NULL
  WHERE s.girone = 'B'
  GROUP BY s.id, s.name
  ORDER BY punti DESC, s.name
)
SELECT * FROM classifica_a
UNION ALL
SELECT * FROM classifica_b
ORDER BY girone, punti DESC;
*/

COMMENT ON TABLE partite IS 'Partite del torneo. fase=finali per le partite finali senza girone';
