# Migration SQL - Ordine di Esecuzione

Esegui questi file SQL nel **Supabase Dashboard → SQL Editor** nell'ordine seguente:

## 📋 Ordine di Esecuzione

### 1️⃣ `00-cleanup.sql` (Pulizia)
**Scopo:** Rimuove funzioni, trigger e policy obsolete
- Rimuove trigger `on_auth_user_created` e funzione `handle_new_user()`
- Rimuove policy RLS incomplete o duplicate sulla tabella `users`
- Prepara il database per le nuove migration

**⚠️ IMPORTANTE:** Esegui questo per primo per evitare conflitti

---

### 2️⃣ `01-setup-users-table.sql` (Setup Utenti Squadra)
**Scopo:** Prepara la tabella `users` esistente per il nuovo sistema
- Aggiunge colonna `user_type` ('team' | 'public')
- Aggiunge colonna `display_name` (nome visualizzato)
- Rende `squadra_id` nullable
- Crea indici per performance
- Migra dati esistenti

**Tabella interessata:** `users`

---

### 3️⃣ `02-create-public-users.sql` (Utenti Pubblici)
**Scopo:** Crea tabella separata per utenti pubblici (spettatori)
- Crea tabella `public_users` con colonne:
  - `id`, `user_id`, `username`, `display_name`, `email`
- Crea trigger `handle_new_public_user()` per inserimento automatico
- Configura policy RLS per lettura/aggiornamento
- Trigger attivato su `auth.users` quando `user_type = 'public'`

**Tabella creata:** `public_users`

**Come funziona:**
1. User si registra con Supabase Auth
2. Trigger legge metadata (`user_type`, `username`, `display_name`)
3. Se `user_type = 'public'`, inserisce in `public_users` automaticamente

---

### 4️⃣ `03-add-vote-type.sql` (Sistema Voti Pesati)
**Scopo:** Aggiunge sistema di voti con peso differenziato
- Aggiunge colonna `vote_type` ('team' | 'public') alla tabella `votes`
- Aggiorna voti esistenti:
  - `'team'` se utente in tabella `users`
  - `'public'` se utente in tabella `public_users`
- Crea indice su `vote_type`

**Tabella interessata:** `votes`

**Formula pesatura:**
```
Valutazione MVP = (Voti Team × 0.9) + (Voti Public × 0.1)
```

---

## 🎯 Risultato Finale

Dopo aver eseguito tutte le migration:

### Tabelle:
- ✅ `users` - Utenti squadre (esistente, aggiornata)
- ✅ `public_users` - Utenti pubblici (nuova)
- ✅ `votes` - Voti con tipo (aggiornata)

### Funzioni/Trigger:
- ✅ `handle_new_public_user()` - Inserimento automatico utenti pubblici
- ✅ `on_auth_public_user_created` - Trigger su `auth.users`
- ✅ `update_public_users_updated_at()` - Aggiornamento timestamp

### Policy RLS:
- ✅ Lettura pubblica di `public_users`
- ✅ Aggiornamento solo proprio profilo

---

## 🚀 Come Eseguire

1. Apri **Supabase Dashboard**
2. Vai su **SQL Editor**
3. Crea una nuova query per ogni file
4. Copia/incolla il contenuto del file SQL
5. Clicca **Run** per eseguire
6. Verifica che non ci siano errori
7. Passa al file successivo

---

## ✅ Verifica

Dopo aver eseguito tutte le migration, verifica:

```sql
-- Controlla struttura public_users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'public_users';

-- Controlla vote_type in votes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'votes' AND column_name = 'vote_type';

-- Controlla trigger esistenti
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

---

## 📝 Note

- Le migration sono **idempotenti**: possono essere eseguite più volte senza errori
- Usano `IF NOT EXISTS` e `IF EXISTS` per evitare conflitti
- La pulizia iniziale rimuove solo elementi obsoleti, non dati utente
