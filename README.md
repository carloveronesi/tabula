<p align="center">
  <img src="app/public/tabula-mark.svg" alt="Tabula" width="96" height="96" />
</p>

<h1 align="center">Tabula</h1>

<p align="center">
  <strong>Il tuo diario di lavoro.</strong> Una PWA locale per tracciare la giornata
  lavorativa — ore su clienti e progetti, attività interne, todo e presenze —
  con frizione zero e tutti i dati sul tuo dispositivo.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=white">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-offline-3a5cd9">
  <img alt="No backend" src="https://img.shields.io/badge/dati-100%25%20locali-3a5cd9">
</p>

---

## Cos'è

**Tabula** è una *Progressive Web App* pensata per un singolo professionista che
traccia la propria giornata di lavoro: cosa ha fatto, su quale cliente o progetto,
quanto tempo, e cosa deve ancora fare.

Funziona come un **calendario** (giorno / settimana / mese) fatto di blocchi-evento,
affiancato da viste di sintesi. È pensata per stare **sempre aperta di lato**: apri,
annoti, chiudi — e a fine periodo ricavi numeri affidabili senza lavoro manuale.

Non c'è backend, non c'è login, non c'è telemetria: **i dati restano nel browser**
(IndexedDB) e sono solo tuoi. Installabile come app e utilizzabile offline.

> La filosofia: lo strumento sta sullo sfondo, il contenuto — il tuo tempo — è il
> protagonista. Calma, precisa, personale: la voce di un buon quaderno, non di
> un'app SaaS.

## Funzionalità

### 📅 Calendario

- **Tre viste** — Giorno, Settimana, Mese — con navigazione rapida (precedente /
  oggi / successivo) e annulla/ripeti delle modifiche.
- **Blocchi-evento** creabili e spostabili con un gesto: trascina per creare,
  sposta e ridimensiona sulla griglia oraria con snapping a 15 o 30 minuti.
- **Copia / incolla dei blocchi** — `⌘C`/`⌘V` (o tasto destro sulla griglia →
  «Incolla qui», più il bottone *Incolla* nel pannello giornata): riporta
  un'attività su un altro giorno/orario conservandone classificazione e contenuti,
  con annulla immediato. Esiste anche **Duplica** (stesso giorno, primo slot libero).
- **Linea "ora corrente"** in stile calendario, aggiornata al minuto.
- **Vista Mese con sidebar di riepilogo**: la griglia mensile affiancata da ore,
  copertura, presenze e ripartizione per cliente; passando o cliccando su un
  cliente/tipo/sede nella sidebar, i giorni corrispondenti spiccano nella griglia.
  Ogni giorno mostra anche un'**icona della sede** (remoto/ufficio/cliente).
- **Quattro tipi di voce**: lavoro su *cliente*, attività *interna*, *ferie*,
  *evento*. Ogni blocco porta titolo, note (Markdown), blocchi/problemi incontrati,
  prossimi passi, collaboratori, contatti, link e milestone.
- **Scorciatoie di durata** nell'editor (Giornata / Mattina / Pomeriggio) per
  impostare gli orari con un gesto — comode per ferie a giornata intera o mezza.
- **Import chiamate da Teams (OCR)** — da uno screenshot della cronologia
  chiamate, l'app legge persona, durata e giorno **in locale** (Tesseract.js,
  nessun upload) e ne abbozza le attività, sempre da rivedere prima di salvare.
- **Shell ad altezza fissa**: la giornata lavorativa sta tutta a video, senza scroll.

### 🗂️ Clienti & Progetti

- Organizza il lavoro per **cliente → progetto → sottotipo**, con cascata di
  selezione e ultimo-usato memorizzato per velocizzare l'inserimento.
- Schede progetto complete: stato (attivo / completato / in pausa / archiviato),
  descrizione, obiettivi, date, team, contatti, ore stimate e sotto-attività.
- **Colore per cliente/sottotipo** sui blocchi del calendario (barra + wash), con
  fallback deterministico — sempre accompagnato dal titolo, mai solo colore.
- **Statistiche di progetto**: ore consuntivate vs. stimate e andamento.

### ✅ Todo

- Lista di cose da fare con **sotto-attività**, tag, scadenza e collegamento a un
  progetto.
- Widget **«Da fare»** nella sidebar del Giorno: i todo non completati (scaduti e
  in scadenza in cima), con spunta per completare e scorciatoia alla lista.

### ⏱️ Timer

- **Timer "in corso"** con un click: avvii, lavori, e allo stop diventa una voce
  del calendario — senza sporcare la griglia mentre gira.

### 🏢 Presenze

- Traccia la **sede del giorno** (da remoto / ufficio / cliente) e monitora il
  rispetto di obiettivi percentuali (es. % minima in ufficio o dal cliente).
- Nel **Mese** ogni giorno porta l'icona della sede e la sidebar permette di
  **filtrare per sede** per vedere a colpo d'occhio dove hai lavorato.

### 📊 Riepilogo

- Sintesi del mese: **ore totali** e media, **giorni compilati** (copertura della
  giornata lavorativa) con ore registrate vs. attese, **presenze** rispetto agli
  obiettivi, e ripartizione **per cliente** con scomposizione per sottotipo.
- Vive nella **sidebar della vista Mese** (con evidenziazione della griglia al
  passaggio sui filtri); la voce **«Riepilogo»** del menu porta direttamente lì.
- **Esporta report**: scarica il mese come file Excel (fogli *Giornaliero* e
  *Totale* con ore per cliente/progetto), generato in locale senza dipendenze.

### 🔍 Ricerca

- Ricerca trasversale su voci, progetti e todo.

### ✨ AI (opzionale, con la tua API key)

Spenta di default: finché non la attivi nelle Impostazioni, l'app non mostra
alcun bottone AI e non fa alcuna chiamata di rete.

- **Bring your own key** — qualsiasi provider con API compatibile OpenAI
  (`/chat/completions`): base URL, key e modello li scegli tu, con preset per i
  più comuni. Nessun servizio intermedio, nessuna dipendenza aggiuntiva.
- **Quick-add in linguaggio naturale** — scrivi *«call con Acme sul portale, un'ora
  e mezza da stamattina»* e il popover propone cliente, progetto, sottotipo, orario
  e giorno. Ogni campo dedotto è **evidenziato** e resta correggibile; il testo
  originale rimane a portata di mano finché non salvi.
- **Riconoscimento di colleghi e referenti** — i nomi citati nella frase vengono
  cercati **in locale** (nessuna chiamata, nessun nome inviato all'AI) tra il team
  del progetto e i contatti del cliente, e arrivano precompilati nell'editor completo.
- **Migliora il testo** — sulle note dell'attività, l'AI propone una riscrittura
  che puoi **applicare o scartare**: non sovrascrive mai nulla da sola.
- **Nel dubbio, campo vuoto.** Se il modello è incerto o si contraddice, il campo
  resta da compilare: un campo vuoto si nota, uno sbagliato finisce nei totali del mese.

### ❓ Aiuto

- Pannello **«Come funziona»** dal `?` nella sidebar: il flusso di una giornata,
  le funzioni principali e le scorciatoie da tastiera — senza uscire dall'app.
- L'elenco delle scorciatoie è **generato da `domain/keymap.ts`** e un test lo
  esegue davvero: non può documentare tasti diversi da quelli che l'app ascolta.

### ⚙️ Impostazioni

Organizzate per sezioni:

- **Generale** — tema chiaro / scuro / sistema, vista predefinita, granularità slot.
- **Orari** — fasce mattino/pomeriggio, giorni lavorativi, giorno del patrono.
- **Categorie** — sottotipi e colori per clienti e attività interne.
- **Presenze** — abilitazione e obiettivi percentuali per sede.
- **AI** — attivazione, provider (preset o base URL), API key e modello, con
  *Prova connessione*.
- **Dati** — import/export.

### 🔒 Privacy & dati locali

- **Nessun backend, nessun account, nessuna telemetria.** Tutto è salvato in
  IndexedDB sul tuo dispositivo.
- **Import / export** dei dati per backup o migrazione. L'API key **non entra mai
  nel file di export** e non finisce nei log.
- **PWA installabile e offline-first**: nessuna dipendenza **esterna** a runtime
  (niente CDN né tracker; icone inline, font di sistema). Anche l'**OCR**
  dell'import da screenshot è self-hosted e gira sul dispositivo — l'immagine non
  lascia mai il browser.
- **L'unica cosa che può uscire dal browser è l'AI, se la attivi tu**, e solo nel
  momento in cui la usi: parte il testo che le dai e — per il quick-add — i nomi
  di clienti e progetti attivi, che le servono per riconoscerli. Lo storico delle
  attività non viene mai inviato, e nemmeno i nomi di colleghi e referenti.

### ♿ Accessibilità

- Target **WCAG 2.1 AA**: contrasti adeguati, focus visibile, navigazione completa
  da tastiera.
- Tema chiaro / scuro / sistema; il colore non è mai l'unico veicolo di significato.
- Rispetto di `prefers-reduced-motion`.

## Stack tecnologico

| Ambito        | Tecnologia |
|---------------|------------|
| UI            | React 18 + TypeScript |
| Build         | Vite 6 |
| Stile         | Tailwind CSS 3 (token OKLCH) |
| Stato         | Zustand |
| Storage       | IndexedDB via Dexie |
| OCR           | Tesseract.js (in locale, self-hosted) |
| AI (opz.)     | `fetch` a un provider OpenAI-compatible, key tua — zero dipendenze |
| Ricorrenze    | rrule |
| Markdown      | react-markdown + remark-gfm |
| Test          | Vitest + Testing Library |

## Avvio rapido

Prerequisiti: **Node.js 18+** e npm.

```bash
git clone <repo-url>
cd Tabula/app
npm install
npm run dev        # http://localhost:5173
```

### Script disponibili (da `app/`)

```bash
npm run dev        # dev server
npm run setup:ocr  # scarica/copia gli asset OCR (Tesseract) in public/
npm run build      # build di produzione (esegue setup:ocr in automatico)
npm run preview    # anteprima della build
npm test           # suite di test (Vitest)
npm run coverage   # test + coverage
npm run typecheck  # type-check (tsc -b)
```

> **OCR offline.** L'import delle chiamate da screenshot usa Tesseract.js
> interamente in locale. Worker, core wasm e lingua italiana sono serviti da
> `public/tesseract/` (gitignored, ~20 MB) e rigenerati con `npm run setup:ocr`;
> il `build` lo invoca da sé. In `dev` lancialo una volta per provare la feature.

## Struttura del progetto

```
app/src/
├── data/        storage (IndexedDB/Dexie), modello dati, import/export, OCR
├── domain/      logica pura (nessun I/O, nessun React) — test-driven
├── store/       stato applicativo (Zustand)
├── features/    UI per dominio (calendar, projects, todo, summary,
│                settings, search, ai, layout)
├── ui/          primitivi UI (Button, Modal, Popover, Combobox, …)
├── pwa/         registrazione service worker / install prompt
└── styles/      token di design e configurazione Tailwind
```

## Metodo di sviluppo

Sviluppo **test-driven** (red → green → refactor): il test precede
l'implementazione. La logica di `domain` / `data` / `store` non entra senza un
test scritto prima.

Per il prodotto e il sistema visivo, vedi [`PRODUCT.md`](PRODUCT.md) e
[`DESIGN.md`](DESIGN.md).

## Licenza

Progetto personale. Tutti i diritti riservati salvo diversa indicazione.
