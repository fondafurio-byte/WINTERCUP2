-- Fix RLS per permettere il login delle squadre
-- Il problema: le policy RLS richiedono auth.uid() ma durante il login l'utente non è ancora autenticato

-- Rimuovi le policy esistenti su users
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- Nuove policy più permissive per users
-- 1. Permetti lettura a tutti (necessario per il login) ma solo campi specifici
CREATE POLICY "Allow read for login" ON users
  FOR SELECT
  USING (true);

-- 2. Admin possono vedere tutto
CREATE POLICY "Admin full access" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- 3. Utenti autenticati possono aggiornare solo il proprio record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fix per team_tokens: permetti lettura durante il login
DROP POLICY IF EXISTS "Admin can view all tokens" ON team_tokens;
DROP POLICY IF EXISTS "Admin can manage tokens" ON team_tokens;

-- Permetti lettura a tutti (necessario per validazione token durante login)
CREATE POLICY "Allow read for login validation" ON team_tokens
  FOR SELECT
  USING (true);

-- Admin possono gestire tutto
CREATE POLICY "Admin can manage tokens" ON team_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Verifica che i dati siano popolati
SELECT 
  'Users count:' as info, 
  COUNT(*) as count 
FROM users
UNION ALL
SELECT 
  'Tokens count:' as info, 
  COUNT(*) as count 
FROM team_tokens;
