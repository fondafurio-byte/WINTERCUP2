# Setup Supabase Storage per Documenti Partite

## 1. Creare il bucket Storage

1. Accedi al **Dashboard Supabase**
2. Vai su **Storage** → **Create bucket**
3. Nome bucket: `partite-documenti`
4. Impostazioni:
   - **Public bucket**: NO (lascia deselezionato)
   - File size limit: 10 MB (default va bene)

## 2. Applicare le RLS Policies

Dopo aver creato il bucket, vai su **Storage** → **Policies** e aggiungi le seguenti policies:

### Policy 1: Upload (Admin e Rilevatori)
```sql
CREATE POLICY "Admin e rilevatori possono caricare documenti"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partite-documenti'
  AND (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM rilevatori WHERE user_id = auth.uid())
  )
);
```

### Policy 2: Read (Admin, Rilevatori, Utenti Squadre)
```sql
CREATE POLICY "Admin, rilevatori e utenti possono leggere documenti"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'partite-documenti'
  AND (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM rilevatori WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid())
  )
);
```

### Policy 3: Delete (Solo Admin)
```sql
CREATE POLICY "Solo admin possono eliminare documenti"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'partite-documenti'
  AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);
```

## 3. Verificare il funzionamento

1. Accedi come **admin** o **rilevatore** nell'app
2. Completa una partita tramite **rilevazione live**
3. Clicca sul pulsante **"Documento"** (viola)
4. Seleziona un'immagine o PDF
5. Verifica che:
   - Il file venga caricato (bottone mostra "Caricamento...")
   - Appaia il link **"Visualizza documento"** (blu)
   - Cliccando il link si apra il documento in una nuova tab

## Note tecniche

- **Compressione immagini**: automatica al 80% di qualità, max 2000x2000px
- **PDF**: passano senza compressione
- **Mobile**: il bottone attiva automaticamente la fotocamera del dispositivo
- **Metadati salvati**: nome file, tipo, chi ha caricato, quando

## Risoluzione problemi

**Errore "bucket not found"**: Verifica che il bucket `partite-documenti` sia stato creato

**Errore "policy violation"**: Controlla che le RLS policies siano state applicate correttamente

**Documento non visibile**: Verifica di essere loggato come admin, rilevatore o utente squadra
