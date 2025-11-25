-- Permetti girone NULL per le partite finali
-- Le finali non appartengono a un girone specifico, quindi girone può essere NULL

-- Rimuovi il constraint NOT NULL da girone (se esiste)
ALTER TABLE partite ALTER COLUMN girone DROP NOT NULL;

-- Aggiungi un commento esplicativo
COMMENT ON COLUMN partite.girone IS 'Girone di appartenenza (A o B). NULL per partite finali (fase=finali)';

-- Verifica le partite finali esistenti
SELECT id, home_team_id, away_team_id, girone, fase, home_score, away_score
FROM partite
WHERE fase = 'finali';
