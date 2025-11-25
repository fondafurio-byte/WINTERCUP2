-- Fix email addresses: usa pattern email+tag con dominio comune
-- Questo formato è supportato da Gmail e altri provider
UPDATE users 
SET email = 'wintercup+' || LOWER(REPLACE(username, '_', '.')) || '@gmail.com';

-- Verifica le email aggiornate
SELECT username, email FROM users ORDER BY username LIMIT 10;
