-- Crea una tabella separata per gli utenti pubblici (spettatori)
-- La tabella users esistente rimane per gli utenti delle squadre

-- 1. Crea la tabella public_users
CREATE TABLE IF NOT EXISTS public_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_public_users_user_id ON public_users(user_id);
CREATE INDEX IF NOT EXISTS idx_public_users_username ON public_users(username);
CREATE INDEX IF NOT EXISTS idx_public_users_email ON public_users(email);

-- 3. Trigger per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_public_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_public_users_updated_at ON public_users;
CREATE TRIGGER update_public_users_updated_at
  BEFORE UPDATE ON public_users
  FOR EACH ROW
  EXECUTE FUNCTION update_public_users_updated_at();

-- 4. Trigger per inserimento automatico quando si registra un utente pubblico
CREATE OR REPLACE FUNCTION public.handle_new_public_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserisci solo se user_type è 'public'
  IF NEW.raw_user_meta_data->>'user_type' = 'public' THEN
    INSERT INTO public.public_users (user_id, username, display_name, email)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'display_name',
      NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_public_user_created ON auth.users;
CREATE TRIGGER on_auth_public_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_public_user();

-- 5. Policy RLS per public_users
ALTER TABLE public_users ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono leggere tutti i profili pubblici
CREATE POLICY "Public users are viewable by everyone"
ON public_users
FOR SELECT
TO authenticated, anon
USING (true);

-- Gli utenti possono aggiornare solo il proprio profilo
CREATE POLICY "Users can update their own public profile"
ON public_users
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Commenti per documentazione
COMMENT ON TABLE public_users IS 'Utenti pubblici (spettatori) che non fanno parte di squadre';
COMMENT ON COLUMN public_users.user_id IS 'Riferimento all''utente in auth.users';
COMMENT ON COLUMN public_users.username IS 'Username univoco per il login';
COMMENT ON COLUMN public_users.display_name IS 'Nome visualizzato pubblicamente';
