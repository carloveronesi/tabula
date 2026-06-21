# Tabula — istruzioni per Claude

PWA locale (React + Vite + Tailwind, dati su IndexedDB) per il tracciamento
giornaliero del lavoro. Vedi `PRODUCT.md` e `DESIGN.md` per prodotto e sistema
visivo. Il codice vive in `app/` (`cd app` per `npm` e i test).

## Modo di lavorare

- **Chiedi prima sulle scelte importanti.** Decisioni di layout, struttura,
  information architecture, rimozione/spostamento di funzionalità o pattern di
  interazione vanno **proposte e confermate con l'utente prima di scriverle**,
  non decise in autonomia. Per scelte di questo peso usa una domanda esplicita
  (es. AskUserQuestion) con la tua raccomandazione, e procedi solo dopo l'ok.
  Le micro-decisioni reversibili (naming, spaziature, dettagli di stile) restano
  a tua discrezione.

## Comandi (da `app/`)

- `npm run dev` — dev server
- `npm test` — suite Vitest
- `npm run typecheck` — `tsc -b`
- `npm run build` — build di produzione
