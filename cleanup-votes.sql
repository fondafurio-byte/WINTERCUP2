-- Script per gestire i voti e le partite
-- Attenzione: questo script elimina dati in modo permanente

-- OPZIONE 1: Elimina TUTTI i voti (gironi + finali)
-- DELETE FROM votes;

-- OPZIONE 2: Elimina solo i voti delle partite di girone (mantiene i voti delle finali)
DELETE FROM votes 
WHERE partita_id IN (
  SELECT id FROM partite WHERE girone IS NOT NULL
);

-- OPZIONE 3: Elimina solo i voti delle finali
-- DELETE FROM votes 
-- WHERE partita_id IN (
--   SELECT id FROM partite WHERE fase = 'finali' OR girone IS NULL
-- );

-- OPZIONE 4: Elimina i voti orfani (partite che non esistono più)
-- DELETE FROM votes 
-- WHERE partita_id NOT IN (SELECT id FROM partite);

-- Verifica i voti rimanenti
SELECT 
  v.id as vote_id,
  p.id as partita_id,
  p.girone,
  p.fase,
  v.final_type,
  v.atleta_id,
  v.voto
FROM votes v
LEFT JOIN partite p ON v.partita_id = p.id
ORDER BY p.fase, p.girone, v.created_at DESC;

-- Verifica le partite rimanenti
SELECT 
  id,
  home_team_id,
  away_team_id,
  girone,
  fase,
  home_score,
  away_score
FROM partite
ORDER BY fase, girone, orario;
