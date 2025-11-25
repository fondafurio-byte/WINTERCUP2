-- Script per pulire tutti i dati di test e ripartire da zero
-- ATTENZIONE: Questo eliminerà tutti i dati delle finali e i relativi voti

-- 1. Elimina tutti i voti delle finali
DELETE FROM votes 
WHERE partita_id IN (
  SELECT id FROM partite WHERE fase = 'finali' OR girone IS NULL OR girone = 'FINALI'
);

-- 2. Elimina tutte le partite finali
DELETE FROM partite 
WHERE fase = 'finali' OR girone IS NULL OR girone = 'FINALI';

-- 3. (OPZIONALE) Elimina anche i punti atleti delle finali
DELETE FROM punti_atleti 
WHERE partita_id NOT IN (SELECT id FROM partite);

-- Verifica che tutto sia stato pulito
SELECT 'Partite finali rimaste:' as check_type, COUNT(*) as count
FROM partite 
WHERE fase = 'finali' OR girone IS NULL OR girone = 'FINALI'
UNION ALL
SELECT 'Voti finali rimasti:', COUNT(*)
FROM votes 
WHERE final_type IS NOT NULL
UNION ALL
SELECT 'Partite gironi rimaste:', COUNT(*)
FROM partite 
WHERE girone IS NOT NULL AND girone != 'FINALI';

-- Mostra le partite rimanenti
SELECT 
  id,
  home_team_id,
  away_team_id,
  girone,
  fase,
  home_score,
  away_score,
  orario
FROM partite
ORDER BY fase, girone, orario;
