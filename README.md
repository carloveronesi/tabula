# Tabula

PWA locale per il tracciamento giornaliero delle attività lavorative. Tutti i dati
restano nel browser. **React 18 + TypeScript + Vite**, storage su **IndexedDB**.

## Sviluppo

```bash
cd app
npm install
npm run dev        # dev server
npm run build      # build di produzione
npm run preview    # anteprima build
npm test           # test (Vitest)
npm run coverage   # test + coverage
npm run typecheck  # type-check
```

## Struttura

```
app/src/
├── data/        storage (IndexedDB/Dexie), modello dati, import
├── domain/      logica pura (nessun I/O, nessun React)
├── store/       stato applicativo (Zustand)
├── features/    UI per dominio (calendario, …)
├── ui/          primitivi UI
└── styles/      token e Tailwind
```

## Metodo

Sviluppo **test-driven** (red → green → refactor): il test precede l'implementazione;
la logica di `domain`/`data`/`store` non entra senza un test scritto prima.
