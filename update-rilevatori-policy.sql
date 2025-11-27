-- Script per permettere la registrazione autonoma dei rilevatori
-- Eseguire questo script nel SQL Editor di Supabase

-- Rimuovi la vecchia policy di inserimento che richiedeva privilegi admin
DROP POLICY IF EXISTS "Allow admin insert on rilevatori" ON rilevatori;

-- Crea una nuova policy che permette:
-- 1. Agli admin di inserire qualsiasi rilevatore
-- 2. A utenti appena registrati di inserire il proprio record (dove user_id = auth.uid())
CREATE POLICY "Allow self registration and admin insert on rilevatori"
  ON rilevatori FOR INSERT
  TO authenticated
  WITH CHECK (
    -- L'utente può inserire il proprio record
    user_id = auth.uid()
    OR
    -- Oppure è un admin che può inserire qualsiasi record
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );
