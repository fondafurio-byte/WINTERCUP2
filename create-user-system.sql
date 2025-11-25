-- Tabella per i token delle società
CREATE TABLE IF NOT EXISTS team_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squadra_id UUID NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  token VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squadra_id)
);

-- Tabella utenti (per le società)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  squadra_id UUID NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  has_changed_password BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squadra_id)
);

-- Funzione per generare token casuale
CREATE OR REPLACE FUNCTION generate_team_token()
RETURNS VARCHAR AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Genera token per tutte le squadre esistenti
INSERT INTO team_tokens (squadra_id, token)
SELECT id, generate_team_token()
FROM squadre
WHERE id NOT IN (SELECT squadra_id FROM team_tokens);

-- Crea utenti per tutte le squadre (senza ancora creare l'utente auth)
-- Gli utenti auth verranno creati al primo login
INSERT INTO users (squadra_id, username, email, has_changed_password)
SELECT 
  s.id,
  LOWER(REPLACE(s.name, ' ', '_')) as username,
  LOWER(REPLACE(s.name, ' ', '_')) || '@wintercup.local' as email,
  FALSE
FROM squadre s
WHERE s.id NOT IN (SELECT squadra_id FROM users)
ON CONFLICT (squadra_id) DO NOTHING;

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at su users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policy RLS per users (solo admin possono vedere tutti, utenti possono vedere solo il proprio)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy RLS per team_tokens (solo admin possono vedere)
ALTER TABLE team_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all tokens" ON team_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage tokens" ON team_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Vista per mostrare società con i loro token (solo per admin)
CREATE OR REPLACE VIEW team_tokens_view AS
SELECT 
  s.id as squadra_id,
  s.name as squadra_nome,
  s.girone,
  t.token,
  u.username,
  u.email,
  u.has_changed_password,
  u.created_at as user_created_at
FROM squadre s
LEFT JOIN team_tokens t ON t.squadra_id = s.id
LEFT JOIN users u ON u.squadra_id = s.id
ORDER BY s.girone, s.name;

-- Commenti
COMMENT ON TABLE team_tokens IS 'Token univoci per ogni squadra usati al primo login';
COMMENT ON TABLE users IS 'Utenti delle squadre con accesso in sola lettura';
COMMENT ON COLUMN users.has_changed_password IS 'TRUE se l''utente ha cambiato la password dal token iniziale';
COMMENT ON FUNCTION generate_team_token IS 'Genera un token casuale di 12 caratteri alfanumerici';

-- Query utile per visualizzare tutti i token (da eseguire dopo come admin)
-- SELECT * FROM team_tokens_view;
