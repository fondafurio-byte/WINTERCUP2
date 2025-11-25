-- Rendi la colonna girone nullable nella tabella squadre
-- Questo permette di creare squadre senza assegnarle subito a un girone

-- Rimuovi il constraint NOT NULL dalla colonna girone
ALTER TABLE squadre ALTER COLUMN girone DROP NOT NULL;

-- Aggiungi un commento esplicativo
COMMENT ON COLUMN squadre.girone IS 'Girone di appartenenza (A o B). NULL se la squadra non è ancora stata assegnata a un girone.';

-- Verifica le squadre esistenti
SELECT id, name, girone, logo_url
FROM squadre
ORDER BY girone NULLS LAST, name;
