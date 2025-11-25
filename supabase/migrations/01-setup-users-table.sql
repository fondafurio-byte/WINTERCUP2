-- Migration per supportare utenti pubblici nella tabella users esistente
-- La tabella users già esiste e contiene gli utenti delle squadre
-- Questa migration aggiunge i campi necessari per gli utenti pubblici

-- 1. Aggiungi la colonna user_type se non esiste
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'team' CHECK (user_type IN ('team', 'public'));

-- 2. Aggiungi la colonna display_name se non esiste (nome visualizzato pubblicamente)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 3. Aggiorna gli utenti esistenti
-- Imposta user_type in base alla presenza di squadra_id
UPDATE users
SET user_type = CASE 
  WHEN squadra_id IS NOT NULL THEN 'team'
  ELSE 'public'
END
WHERE user_type IS NULL OR user_type = 'team';

-- Imposta display_name per gli utenti esistenti che non ce l'hanno
UPDATE users
SET display_name = username
WHERE display_name IS NULL;

-- 4. Modifica la colonna squadra_id per permettere NULL (utenti pubblici non hanno squadra)
ALTER TABLE users
ALTER COLUMN squadra_id DROP NOT NULL;

-- 5. Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 6. Aggiungi commenti per documentare
COMMENT ON COLUMN users.user_type IS 'Tipo di utente: team (con squadra) o public (spettatore registrato)';
COMMENT ON COLUMN users.display_name IS 'Nome visualizzato pubblicamente (può essere diverso dallo username)';
COMMENT ON COLUMN users.squadra_id IS 'ID della squadra (NULL per utenti pubblici)';
