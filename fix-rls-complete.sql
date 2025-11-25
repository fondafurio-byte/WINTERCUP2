-- Rimozione completa di tutte le policy esistenti
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Rimuovi tutte le policy da users
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    END LOOP;
    
    -- Rimuovi tutte le policy da team_tokens
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'team_tokens'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON team_tokens', pol.policyname);
    END LOOP;
END $$;

-- Nuove policy per users
CREATE POLICY "Allow read for login" ON users
  FOR SELECT
  USING (true);

CREATE POLICY "Admin full access" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Nuove policy per team_tokens
CREATE POLICY "Allow read for login validation" ON team_tokens
  FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage tokens" ON team_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Verifica finale
SELECT 'users policies' as info, COUNT(*) as count FROM pg_policies WHERE tablename = 'users'
UNION ALL
SELECT 'team_tokens policies' as info, COUNT(*) as count FROM pg_policies WHERE tablename = 'team_tokens';
