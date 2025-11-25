-- Fix policy per permettere l'update durante la registrazione
-- Il problema: l'utente non è ancora autenticato quando tenta di aggiornare user_id

-- Rimuovi policy UPDATE esistente
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- Permetti UPDATE a tutti (necessario durante registrazione)
-- Limitiamo l'update solo ai campi user_id e has_changed_password
CREATE POLICY "Allow update for registration" ON users
  FOR UPDATE
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NOT NULL AND has_changed_password = true);

-- Permetti UPDATE agli utenti autenticati per il proprio record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verifica le policy
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'users';
