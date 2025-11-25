-- Tabella per i voti MVP degli atleti
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partita_id UUID NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
  atleta_id UUID NOT NULL REFERENCES atleti(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un utente può votare solo una volta per partita
  UNIQUE(partita_id, user_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_votes_partita ON votes(partita_id);
CREATE INDEX IF NOT EXISTS idx_votes_atleta ON votes(atleta_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);

-- RLS policies
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere i voti (per mostrare conteggi)
CREATE POLICY "Anyone can read votes" ON votes
  FOR SELECT
  USING (true);

-- Solo utenti autenticati possono votare
CREATE POLICY "Authenticated users can insert votes" ON votes
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Gli utenti possono aggiornare solo i propri voti
CREATE POLICY "Users can update own votes" ON votes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Gli utenti possono cancellare solo i propri voti
CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE
  USING (user_id = auth.uid());

-- Vista per conteggio voti per atleta
CREATE OR REPLACE VIEW athlete_votes AS
SELECT 
  a.id as atleta_id,
  a.squadra_id,
  COUNT(v.id) as vote_count
FROM atleti a
LEFT JOIN votes v ON v.atleta_id = a.id
GROUP BY a.id, a.squadra_id;

-- Commenti
COMMENT ON TABLE votes IS 'Voti MVP assegnati dagli utenti agli atleti dopo le partite';
COMMENT ON COLUMN votes.partita_id IS 'Partita per cui viene assegnato il voto';
COMMENT ON COLUMN votes.atleta_id IS 'Atleta che riceve il voto MVP';
COMMENT ON COLUMN votes.user_id IS 'Utente che ha votato';

-- Verifica
SELECT 'Votes table created' as status;
