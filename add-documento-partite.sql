-- Script per aggiungere funzionalità documenti partite
-- Aggiunge campi per gestire il caricamento di documenti (PDF/immagini) per ogni partita
-- Eseguire questo script nel SQL Editor di Supabase

-- Aggiunge campi documento alla tabella partite
ALTER TABLE partite ADD COLUMN IF NOT EXISTS documento_url TEXT;
ALTER TABLE partite ADD COLUMN IF NOT EXISTS documento_nome TEXT;
ALTER TABLE partite ADD COLUMN IF NOT EXISTS documento_tipo TEXT;
ALTER TABLE partite ADD COLUMN IF NOT EXISTS documento_caricato_da UUID REFERENCES rilevatori(id);
ALTER TABLE partite ADD COLUMN IF NOT EXISTS documento_caricato_il TIMESTAMPTZ;

-- Commenti per documentazione
COMMENT ON COLUMN partite.documento_url IS 'URL del documento caricato per la partita (tabellino, referto, etc.)';
COMMENT ON COLUMN partite.documento_nome IS 'Nome originale del file caricato';
COMMENT ON COLUMN partite.documento_tipo IS 'Tipo MIME del documento (application/pdf, image/jpeg, etc.)';
COMMENT ON COLUMN partite.documento_caricato_da IS 'ID del rilevatore che ha caricato il documento';
COMMENT ON COLUMN partite.documento_caricato_il IS 'Data e ora di caricamento del documento';

-- Note: Creare manualmente un bucket Storage su Supabase chiamato "partite-documenti"
-- Dashboard Supabase > Storage > New Bucket > Nome: "partite-documenti" > Public: NO

-- Policy RLS per Storage (da eseguire dopo aver creato il bucket)
-- 1. Policy per upload (solo admin e rilevatori)
-- CREATE POLICY "Admin e rilevatori upload documenti"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'partite-documenti' AND
--   (
--     EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
--     OR
--     EXISTS (SELECT 1 FROM rilevatori WHERE user_id = auth.uid())
--   )
-- );

-- 2. Policy per lettura (admin, rilevatori e utenti squadre)
-- CREATE POLICY "Admin, rilevatori e squadre leggono documenti"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'partite-documenti' AND
--   (
--     EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
--     OR
--     EXISTS (SELECT 1 FROM rilevatori WHERE user_id = auth.uid())
--     OR
--     EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid())
--   )
-- );

-- 3. Policy per eliminazione (solo admin e il rilevatore che ha caricato)
-- CREATE POLICY "Admin e rilevatore autore eliminano documenti"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'partite-documenti' AND
--   EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
-- );
