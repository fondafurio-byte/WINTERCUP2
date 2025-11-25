
# Vite + React starter

Progetto base creato con Vite + React + TypeScript. Contiene una pagina minimale che mostra il logo e un piccolo set di componenti (Admin dialog) per iniziare.

Getting started

1. Installa le dipendenze:

```powershell
npm install
```

2. Avvia in sviluppo:

```powershell
npm run dev
```

3. Build per produzione e preview:

```powershell
npm run build
npm run preview
```

Struttura principale

- `index.html` — entry della app
- `src/main.tsx` — bootstrap React
- `src/App.tsx` — componente principale (contiene il pulsante Admin)
- `src/components/AdminDialog.tsx` — dialog per login Admin (client-side)
- `src/lib/supabase.ts` — wrapper per il client Supabase
- `src/styles.css` — stili base
- `public/icons` — icone generate dal logo

Variabili d'ambiente

Creare un file `.env.local` (non committare) con le variabili client di Supabase:

```text
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

Nota su sicurezza

- L'app include un semplice `AdminDialog` che usa la `anon` key client-side per eseguire il login e leggere la tabella `admins`. Questo è comodo per sviluppo, ma NON è consigliato in produzione: la verifica `admin` dovrebbe idealmente essere fatta server-side con la `service_role` key (ad esempio in una funzione serverless). Posso aggiungere un endpoint serverless (Vercel Function) che esegue la verifica in modo sicuro se vuoi.

Pulizia dipendenze

- Ho rimosso i file di configurazione e le dipendenze residue di Next/Tailwind per lasciare il progetto minimale. Se preferisci riabilitare Tailwind + shadcn/ui lo posso fare e configurare tutto.

Se vuoi che proceda con altri miglioramenti (es. endpoint serverless per admin, pagina `/admin` protetta, tipi per `import.meta.env` o test con Vitest) dimmi quale preferisci e lo implemento.

