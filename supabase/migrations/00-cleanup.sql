-- Migration di pulizia: rimuove funzioni e trigger obsoleti o inutilizzati
-- Esegui questa PRIMA delle altre migration per evitare conflitti

-- 1. Rimuovi trigger e funzioni obsolete per la gestione utenti pubblici in tabella users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Rimuovi eventuali policy RLS duplicate o incomplete sulla tabella users
DROP POLICY IF EXISTS "Users can insert their own record during registration" ON users;
DROP POLICY IF EXISTS "Users can read their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Public can read basic user info" ON users;
DROP POLICY IF EXISTS "Anyone can read users for login lookup" ON users;

-- 3. Rimuovi eventuali trigger di auto-update duplicati
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;

-- 4. Lista delle funzioni e trigger che RIMARRANNO dopo le migration:
-- - handle_new_public_user() -> gestisce inserimento in public_users
-- - on_auth_public_user_created -> trigger per utenti pubblici
-- - update_public_users_updated_at() -> aggiorna timestamp in public_users

COMMENT ON SCHEMA public IS 'Schema pulito, pronto per le nuove migration';
