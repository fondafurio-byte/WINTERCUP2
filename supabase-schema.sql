-- Tabella per lo staff delle squadre
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  squadra_id UUID NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  ruolo TEXT NOT NULL CHECK (ruolo IN ('Istruttore 1', 'Istruttore 2', 'Accompagnatore')),
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per gli atleti delle squadre
CREATE TABLE IF NOT EXISTS atleti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  squadra_id UUID NOT NULL REFERENCES squadre(id) ON DELETE CASCADE,
  numero_maglia TEXT NOT NULL, -- TEXT per gestire "0", "00" e numeri normali
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraint per assicurare che numero_maglia sia unico per squadra
  UNIQUE(squadra_id, numero_maglia)
);

-- Indici per migliorare le performance delle query
CREATE INDEX IF NOT EXISTS idx_staff_squadra ON staff(squadra_id);
CREATE INDEX IF NOT EXISTS idx_atleti_squadra ON atleti(squadra_id);

-- Trigger per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_atleti_updated_at
  BEFORE UPDATE ON atleti
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Abilita Row Level Security (RLS)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE atleti ENABLE ROW LEVEL SECURITY;

-- Policy per permettere a tutti di leggere
CREATE POLICY "Allow public read access on staff"
  ON staff FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access on atleti"
  ON atleti FOR SELECT
  TO public
  USING (true);

-- Policy per permettere agli admin autenticati di inserire/aggiornare/eliminare
-- (Assumendo che hai una tabella 'admins' con user_id)
CREATE POLICY "Allow admin insert on staff"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin update on staff"
  ON staff FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin delete on staff"
  ON staff FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin insert on atleti"
  ON atleti FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin update on atleti"
  ON atleti FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin delete on atleti"
  ON atleti FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

-- Tabella per tracciare i punti segnati dagli atleti in ogni partita
CREATE TABLE IF NOT EXISTS punti_atleti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partita_id UUID NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES atleti(id) ON DELETE CASCADE,
  punti INTEGER NOT NULL CHECK (punti >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice per query veloci
CREATE INDEX IF NOT EXISTS idx_punti_atleti_partita ON punti_atleti(partita_id);
CREATE INDEX IF NOT EXISTS idx_punti_atleti_atleta ON punti_atleti(atleta_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_punti_atleti_updated_at
  BEFORE UPDATE ON punti_atleti
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE punti_atleti ENABLE ROW LEVEL SECURITY;

-- Policy lettura pubblica
CREATE POLICY "Allow public read access on punti_atleti"
  ON punti_atleti FOR SELECT
  TO public
  USING (true);

-- Tabella per i rilevatori (hanno accesso solo a inserire/modificare punti atleti)
CREATE TABLE IF NOT EXISTS rilevatori (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Indice per rilevatori
CREATE INDEX IF NOT EXISTS idx_rilevatori_user ON rilevatori(user_id);

-- RLS per rilevatori
ALTER TABLE rilevatori ENABLE ROW LEVEL SECURITY;

-- Policy lettura pubblica per rilevatori
CREATE POLICY "Allow public read access on rilevatori"
  ON rilevatori FOR SELECT
  TO public
  USING (true);

-- Policy admin per gestire rilevatori
CREATE POLICY "Allow admin insert on rilevatori"
  ON rilevatori FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin update on rilevatori"
  ON rilevatori FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin delete on rilevatori"
  ON rilevatori FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE user_id = auth.uid()
    )
  );

-- Policy admin e rilevatori per insert/update/delete punti_atleti
CREATE POLICY "Allow admin and rilevatori insert on punti_atleti"
  ON punti_atleti FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM rilevatori WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin and rilevatori update on punti_atleti"
  ON punti_atleti FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM rilevatori WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admin and rilevatori delete on punti_atleti"
  ON punti_atleti FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM rilevatori WHERE user_id = auth.uid()
    )
  );

-- Aggiungere campo is_live alla tabella partite per tracking rilevazione in corso
-- NOTA: Eseguire solo se la colonna non esiste già
ALTER TABLE partite ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- Policy per permettere ad admin e rilevatori di aggiornare partite (is_live, home_score, away_score)
-- Prima verifichiamo che RLS sia abilitato su partite
ALTER TABLE partite ENABLE ROW LEVEL SECURITY;

-- Policy lettura pubblica per partite (probabilmente già esiste, ma la includiamo per sicurezza)
DROP POLICY IF EXISTS "Allow public read access on partite" ON partite;
CREATE POLICY "Allow public read access on partite"
  ON partite FOR SELECT
  TO public
  USING (true);

-- Policy per permettere ad admin e rilevatori di aggiornare partite
DROP POLICY IF EXISTS "Allow admin and rilevatori update on partite" ON partite;
CREATE POLICY "Allow admin and rilevatori update on partite"
  ON partite FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM rilevatori WHERE user_id = auth.uid()
    )
  );

-- Policy per permettere ad admin di inserire ed eliminare partite
DROP POLICY IF EXISTS "Allow admin insert on partite" ON partite;
CREATE POLICY "Allow admin insert on partite"
  ON partite FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow admin delete on partite" ON partite;
CREATE POLICY "Allow admin delete on partite"
  ON partite FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()
    )
  );

