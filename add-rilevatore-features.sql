-- Script per aggiungere funzionalità rilevatori
-- 1. Aggiunge nome e cognome alla tabella rilevatori
-- 2. Aggiunge campo rilevatore_id alla tabella partite
-- Eseguire questo script nel SQL Editor di Supabase

-- Aggiunge nome e cognome ai rilevatori
ALTER TABLE rilevatori ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE rilevatori ADD COLUMN IF NOT EXISTS cognome TEXT;

-- Aggiunge il campo rilevatore_id alla tabella partite (rilevatore assegnato alla partita)
ALTER TABLE partite ADD COLUMN IF NOT EXISTS rilevatore_id UUID REFERENCES rilevatori(id) ON DELETE SET NULL;

-- Crea indice per performance
CREATE INDEX IF NOT EXISTS idx_partite_rilevatore ON partite(rilevatore_id);

-- Commenti per documentazione
COMMENT ON COLUMN rilevatori.nome IS 'Nome del rilevatore';
COMMENT ON COLUMN rilevatori.cognome IS 'Cognome del rilevatore';
COMMENT ON COLUMN partite.rilevatore_id IS 'Rilevatore assegnato alla partita (visibile solo agli admin)';
