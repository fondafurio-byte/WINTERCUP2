# Sistema di Registrazione Utenti Pubblici e Voti Ponderati per MVP

## 📋 Riepilogo delle Modifiche

### 1. **Nuovo Componente: PublicUserRegistration** ✅
**File:** `src/components/PublicUserRegistration.tsx`

**Caratteristiche:**
- Dialog di registrazione per utenti pubblici (spettatori)
- Campi richiesti:
  - Nome visualizzato
  - Email
  - Password (minimo 6 caratteri)
  - Conferma password
- Integrazione con Supabase Auth (signUp)
- Creazione automatica record nella tabella `users` con:
  - `squadra_id = null` (nessuna squadra associata)
  - `user_type = 'public'`
  - `has_changed_password = true`
- Messaggio informativo: spiega che i voti pubblici hanno peso 10%
- Validazioni integrate e feedback utente

---

### 2. **Aggiornamento TeamLoginDialog** ✅
**File:** `src/components/TeamLoginDialog.tsx`

**Modifiche:**
- Aggiunto import di `PublicUserRegistration` e icona `UserPlus`
- Nuovo state: `const [showRegistration, setShowRegistration] = useState(false)`
- Aggiunto pulsante "Registrati come Utente" sotto il form di login
- Divisore visivo "oppure" tra login e registrazione
- Apertura del dialog di registrazione al click

**Flusso utente:**
```
Login Dialog
    ↓
"Registrati come Utente" button
    ↓
PublicUserRegistration Dialog
    ↓
Registrazione completata → può fare login
```

---

### 3. **Migrazione Database: add-vote-type.sql** ✅
**File:** `supabase/migrations/add-vote-type.sql`

**Modifiche al database:**

#### Tabella `votes`:
```sql
ALTER TABLE votes 
ADD COLUMN vote_type TEXT DEFAULT 'public' 
CHECK (vote_type IN ('team', 'public'));
```

#### Tabella `users`:
```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'team' 
CHECK (user_type IN ('team', 'public'));
```

#### Aggiornamento dati esistenti:
- Voti esistenti: `vote_type = 'team'` se l'utente ha `squadra_id` non null
- Utenti esistenti: `user_type` basato su presenza di `squadra_id`

#### Indici per performance:
- `idx_votes_type` sulla colonna `vote_type`
- `idx_users_type` sulla colonna `user_type`

---

### 4. **Aggiornamento VoteDialog** ✅
**File:** `src/components/VoteDialog.tsx`

**Modifiche a `handleSubmit()`:**
```typescript
// Determina il tipo di voto in base all'utente
const { data: userData } = await supabase
  .from('users')
  .select('user_type, squadra_id')
  .eq('user_id', user.id)
  .single()

const voteType = (userData?.squadra_id !== null) ? 'team' : 'public'
```

- Quando si crea/aggiorna un voto, il campo `vote_type` viene impostato automaticamente
- Logica: se l'utente ha una squadra associata → voto 'team', altrimenti → voto 'public'

---

### 5. **Sistema di Voti Ponderati in Home.tsx** ✅
**File:** `src/pages/Home.tsx`

#### Aggiornato tipo `topScorers`:
```typescript
const [topScorers, setTopScorers] = useState<Array<{
  id: string
  nome: string
  cognome: string
  numero_maglia: string
  totalPoints: number
  squadra_nome: string
  logo_url: string | null
  voteCount: number      // ← NUOVO: voti ponderati
  teamVotes: number      // ← NUOVO: voti squadre (raw)
  publicVotes: number    // ← NUOVO: voti pubblici (raw)
}>>([])
```

#### Funzione `handleTeamClick()` - Calcolo voti ponderati:
```typescript
// Query con vote_type
supabase.from('votes').select('atleta_id, vote_type')

// Calcolo statistiche voti
const voteStats: Record<string, { team: number; public: number; weighted: number }> = {}

votesRes.data.forEach((vote: any) => {
  if (!voteStats[vote.atleta_id]) {
    voteStats[vote.atleta_id] = { team: 0, public: 0, weighted: 0 }
  }
  
  if (vote.vote_type === 'team') {
    voteStats[vote.atleta_id].team++
  } else {
    voteStats[vote.atleta_id].public++
  }
})

// Formula ponderata: team 90% + public 10%
Object.keys(voteStats).forEach(atletaId => {
  const stats = voteStats[atletaId]
  stats.weighted = (stats.team * 0.9) + (stats.public * 0.1)
})
```

#### Funzione `loadTopScorers()`:
- Stessa logica di calcolo ponderato
- Include voti ponderati per Top 10 Realizzatori

#### Visualizzazione badge voti:
```tsx
<span
  style={{ /* gradient gold */ }}
  title={`Voti Ponderati: ${athlete.voteCount.toFixed(1)}
Squadre (90%): ${athlete.teamVotes || 0}
Pubblico (10%): ${athlete.publicVotes || 0}`}
>
  🏆 {athlete.voteCount.toFixed(1)}
</span>
```

**Caratteristiche badge:**
- Mostra voto ponderato con 1 decimale
- Tooltip con dettaglio completo (team votes + public votes)
- Icona 🏆 per MVP votes
- Gradient giallo/oro

---

## 🎯 Formula di Ponderazione

### Voti MVP:
```
VOTO_PONDERATO = (voti_team × 0.9) + (voti_public × 0.1)
```

### Esempi:
1. **Atleta A:** 5 voti team, 10 voti public
   - Ponderato: `(5 × 0.9) + (10 × 0.1) = 4.5 + 1.0 = 5.5`

2. **Atleta B:** 10 voti team, 0 voti public
   - Ponderato: `(10 × 0.9) + (0 × 0.1) = 9.0`

3. **Atleta C:** 0 voti team, 20 voti public
   - Ponderato: `(0 × 0.9) + (20 × 0.1) = 2.0`

**Conclusione:** I voti delle squadre hanno 9× il peso dei voti pubblici.

---

## 🔄 Flusso di Autenticazione

### Utente Squadra (Team):
1. Inserisce username nella finestra di login
2. Se primo accesso: valida token → imposta password
3. Se accesso successivo: login con password
4. `user_type = 'team'` → voti pesano 90%

### Utente Pubblico:
1. Clicca "Registrati come Utente" nel login dialog
2. Compila form registrazione (nome, email, password)
3. Account creato con `user_type = 'public'`
4. Può fare login ed esprimere voti → voti pesano 10%

---

## 📊 Impatto Database

### Prima della migrazione:
```
votes: { id, partita_id, atleta_id, user_id, created_at }
users: { user_id, username, email, squadra_id, has_changed_password }
```

### Dopo la migrazione:
```
votes: { 
  id, partita_id, atleta_id, user_id, created_at,
  vote_type TEXT ← NUOVO ('team' | 'public')
}

users: { 
  user_id, username, email, squadra_id, has_changed_password,
  user_type TEXT ← NUOVO ('team' | 'public')
}
```

---

## ✅ Testing Checklist

### Registrazione:
- [ ] Aprire Home page
- [ ] Cliccare area "Accesso Squadre"
- [ ] Cliccare "Registrati come Utente"
- [ ] Compilare form con dati validi
- [ ] Verificare creazione account
- [ ] Verificare login con nuove credenziali

### Voti Ponderati:
- [ ] Eseguire migrazione SQL `add-vote-type.sql`
- [ ] Creare voti con utente team
- [ ] Creare voti con utente pubblico
- [ ] Verificare calcolo ponderato nel badge 🏆
- [ ] Verificare tooltip con dettaglio voti
- [ ] Verificare Top 10 Realizzatori mostra voti ponderati

### UI/UX:
- [ ] Badge voti mostra decimale (es: "🏆 5.5")
- [ ] Tooltip leggibile con breakdown
- [ ] Pulsante "Registrati" visibile e funzionante
- [ ] Divisore "oppure" correttamente visualizzato

---

## 🚀 Prossimi Passi

1. **Eseguire la migrazione SQL:**
   ```bash
   # Connettiti al database Supabase
   # Esegui il file: supabase/migrations/add-vote-type.sql
   ```

2. **Testare la registrazione:**
   - Aprire l'app in dev mode
   - Provare il flusso di registrazione completo

3. **Verificare i voti:**
   - Votare con utenti team
   - Votare con utenti pubblici
   - Verificare i calcoli ponderati

4. **Aggiornare la documentazione utente** (opzionale):
   - Spiegare il sistema di ponderazione agli utenti
   - Comunicare che i voti pubblici hanno peso ridotto

---

## 📝 Note Tecniche

### Compatibilità:
- ✅ Voti esistenti vengono automaticamente marcati come 'team' o 'public'
- ✅ Nessuna perdita di dati durante la migrazione
- ✅ RLS policies esistenti rimangono valide
- ✅ Backward compatible (se vote_type manca, default = 'public')

### Performance:
- Indici aggiunti su `vote_type` e `user_type`
- Query ottimizzate con calcolo lato client
- Caricamento parallelo di punti e voti

### Sicurezza:
- Validazione password (min 6 caratteri)
- CHECK constraints sul database
- RLS policies mantengono controllo accessi
- Email confirmation disabilitata (già configurato)

---

**Data implementazione:** ${new Date().toLocaleDateString('it-IT')}
**Versione:** 2.0 - Sistema Voti Ponderati
