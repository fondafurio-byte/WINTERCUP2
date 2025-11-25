-- Aggiungere il campo 'logo_url' alla tabella squadre per memorizzare l'URL del logo della squadra

ALTER TABLE squadre ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Creare indice per query più veloci (opzionale)
CREATE INDEX IF NOT EXISTS idx_squadre_logo ON squadre(logo_url) WHERE logo_url IS NOT NULL;
