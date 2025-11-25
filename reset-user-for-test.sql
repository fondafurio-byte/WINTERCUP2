-- Reset dell'utente per testare di nuovo il flusso completo
UPDATE users 
SET user_id = NULL, has_changed_password = FALSE 
WHERE username = 'jbk_ravenna';

-- Elimina l'account auth esistente (se presente)
-- NOTA: Questo va fatto manualmente dalla dashboard Supabase > Authentication > Users
-- Cerca l'email wintercup+jbk.ravenna@gmail.com e eliminala

-- Verifica reset
SELECT username, email, user_id, has_changed_password FROM users WHERE username = 'jbk_ravenna';
