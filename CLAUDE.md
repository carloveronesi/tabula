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

## AI (opt-in, BYO-key)

Vincoli da non violare senza chiederlo:

- **È opt-in.** Con `settings.ai.enabled` falso non parte nessuna chiamata e non
  compare nessun bottone AI.
- **Una sola porta di uscita**: `domain/ai/client.ts` (`chat()`), un `fetch` a un
  provider OpenAI-compatible. Non aggiungere altri punti di chiamata né dipendenze.
- **La API key non esce mai**: né nell'export, né nei log. Il campo è `type="password"`.
- **Non aggiungere dati al prompt** senza l'ok esplicito dell'utente. Oggi partono
  solo: il testo scritto da lui e, per il quick-add, i nomi di clienti e progetti
  *non archiviati*. Mai lo storico delle attività, mai i nomi di persone.
  Se cambi cosa viene inviato, aggiorna la frase nei Settings e nel README.
- **Nel dubbio, campo vuoto.** Un campo sbagliato ma compilato viene salvato senza
  guardarlo e falsa i totali del mese; uno vuoto si nota.
- **Niente `AbortSignal.any` / `AbortSignal.timeout`**: manca su Safari < 17.4 e in
  jsdom, e fallisce *dentro* la fetch travestito da errore di rete. `AbortController`
  a mano.

## Comandi (da `app/`)

- `npm run dev` — dev server
- `npm test` — suite Vitest
- `npm run typecheck` — `tsc -b`
- `npm run build` — build di produzione
- `npm run setup:ocr` — vendorizza gli asset OCR (Tesseract) in `public/tesseract/`
  (gitignored); serve una volta su un checkout fresco per provare l'import da
  screenshot. Il `build` lo esegue da sé (hook `prebuild`).
