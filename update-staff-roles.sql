-- Rimuovere il vecchio constraint
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_ruolo_check;

-- Aggiungere il nuovo constraint con i nuovi ruoli
ALTER TABLE staff ADD CONSTRAINT staff_ruolo_check 
  CHECK (ruolo IN ('Head Coach', 'Assistente', 'Accompagnatore', 'Istruttore 1', 'Istruttore 2'));

-- Opzionale: Aggiornare i vecchi record per usare i nuovi nomi
UPDATE staff SET ruolo = 'Head Coach' WHERE ruolo = 'Istruttore 1';
UPDATE staff SET ruolo = 'Assistente' WHERE ruolo = 'Istruttore 2';

-- Dopo aver aggiornato tutti i record, puoi rimuovere i vecchi valori dal constraint
-- (Esegui questo solo DOPO aver verificato che tutti i record sono stati aggiornati)
-- ALTER TABLE staff DROP CONSTRAINT staff_ruolo_check;
-- ALTER TABLE staff ADD CONSTRAINT staff_ruolo_check 
--   CHECK (ruolo IN ('Head Coach', 'Assistente', 'Accompagnatore'));
