-- Aggiungi il campo vote_type alla tabella votes per distinguere voti delle squadre da voti pubblici
-- Vote type: 'team' (90% peso) o 'public' (10% peso)
-- NOTA: Esegui dopo aver creato la tabella public_users

-- Aggiungi la colonna vote_type (se non esiste già)
ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS vote_type TEXT DEFAULT 'public' CHECK (vote_type IN ('team', 'public'));

-- Aggiorna i voti esistenti:
-- - 'team' se l'utente è nella tabella users (utenti squadra)
-- - 'public' se l'utente è nella tabella public_users (utenti pubblici)
UPDATE votes v
SET vote_type = CASE
  WHEN EXISTS (SELECT 1 FROM users u WHERE u.user_id = v.user_id) THEN 'team'
  WHEN EXISTS (SELECT 1 FROM public_users pu WHERE pu.user_id = v.user_id) THEN 'public'
  ELSE 'public'
END;

-- Crea un indice per migliorare le performance delle query sui voti
CREATE INDEX IF NOT EXISTS idx_votes_type ON votes(vote_type);

COMMENT ON COLUMN votes.vote_type IS 'Tipo di voto: team (90% peso) o public (10% peso)';
