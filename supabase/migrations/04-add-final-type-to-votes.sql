-- Aggiungi colonna final_type alla tabella votes per distinguere le finali
-- Questa colonna permette di applicare pesi diversi ai voti MVP delle finali

ALTER TABLE votes 
ADD COLUMN IF NOT EXISTS final_type TEXT CHECK (final_type IN ('1-2', '3-4', '5-6', '7-8'));

-- Crea indice per query veloci sui voti delle finali
CREATE INDEX IF NOT EXISTS idx_votes_final_type ON votes(final_type);

-- Commenti
COMMENT ON COLUMN votes.final_type IS 'Tipo di finale: 1-2 (1°/2° posto), 3-4 (3°/4° posto), 5-6 (5°/6° posto), 7-8 (7°/8° posto). NULL per partite di girone.';
