-- Aggiungere il campo 'fase' alla tabella partite per gestire il torneo a fasi
-- Fase '1': Gironi iniziali (A e B con 3 squadre ciascuno)
-- Fase '2': Gironi di ripescaggio (A con 1°+1°+migliore 2°, B con peggiore 2°+3°+3°)
-- Fase 'finali': Partite finali determinate dalle classifiche finali

ALTER TABLE partite ADD COLUMN IF NOT EXISTS fase TEXT DEFAULT '1' CHECK (fase IN ('1', '2', 'finali'));

-- Aggiornare tutte le partite esistenti a fase '1'
UPDATE partite SET fase = '1' WHERE fase IS NULL;

-- Creare indice per query più veloci
CREATE INDEX IF NOT EXISTS idx_partite_fase ON partite(fase);
CREATE INDEX IF NOT EXISTS idx_partite_girone_fase ON partite(girone, fase);
