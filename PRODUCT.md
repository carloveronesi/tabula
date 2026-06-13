# Product

## Register

product

## Users

Un singolo professionista che traccia la propria giornata di lavoro: ore su
clienti e progetti, attività interne, todo, presenze. Lo usa ogni giorno, spesso
più volte al giorno, per annotare cosa ha fatto e pianificare cosa fare —
sul desktop come strumento "sempre aperto di lato". Il job-to-be-done: registrare
e rivedere il tempo con il minimo attrito, senza che lo strumento si metta in mezzo.

## Product Purpose

Tabula è una PWA locale (dati su IndexedDB, nessun backend) per il tracciamento
giornaliero delle attività — un diario di lavoro. Mostra la giornata/settimana/mese
come un calendario, con blocchi-evento collegati a clienti, progetti e sottotipi,
più viste di sintesi (Progetti, Todo, Riepilogo). Il successo è la frizione zero:
aprire, annotare, chiudere; e, a fine periodo, ricavare numeri affidabili senza
lavoro manuale.

## Brand Personality

Calma, editoriale, riservata. Tre parole: **quieta, precisa, personale**. La voce è
quella di un buon quaderno, non di un'app SaaS: parla italiano naturale, niente
gergo da prodotto, niente esultanza. Lo strumento sta sullo sfondo; il contenuto
(il tempo dell'utente) è il protagonista. Emotivamente deve trasmettere ordine e
controllo senza ansia.

## Anti-references

- **SaaS generico**: niente gradient viola, card identiche a griglia, hero-metric
  con numerone, eyebrow maiuscoli tracciati sopra ogni sezione, accenti fluo.
- Niente "dashboard che urla": nessuna competizione visiva tra elementi, nessun
  badge colorato ovunque.
- Il modello d'**interazione** è ispirato al calendario di Teams (pattern: griglia
  oraria, blocchi, navigazione periodo), ma l'**identità visiva è propria** e non
  deve richiamare Microsoft/Office né Google Calendar.

## Design Principles

1. **Il contenuto è il protagonista.** La UI è carta e inchiostro: superfici quiete,
   struttura a filo (hairline), colore speso solo dove informa.
2. **Una sola voce di colore.** Un unico accento **cobalto** marca azioni,
   selezione, "oggi" e i blocchi-evento. Tutto il resto è inchiostro freddo su
   bianco (o near-black freddo su scuro). Look nitido-tecnico, non editoriale.
3. **Densità senza rumore.** Mostrare molto tempo a colpo d'occhio, ma con ritmo e
   respiro: la leggibilità della griglia viene prima della decorazione.
4. **Frizione zero.** Ogni azione frequente (creare/spostare un blocco, cambiare
   vista, navigare il periodo) deve costare un gesto, con stati a fuoco evidenti.
5. **Locale e onesto.** Nessuna telemetria, nessun dark pattern; lo strumento è
   dell'utente e i suoi dati restano sul dispositivo.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA**: testo corpo ≥ 4.5:1, testo grande/UI ≥ 3:1; focus
  visibile su ogni elemento interattivo; navigazione completa da tastiera.
- Tema **chiaro/scuro/sistema**; il colore non è mai l'unico veicolo di
  significato (forma/etichetta accanto al colore per i blocchi-evento).
- Rispetto di **`prefers-reduced-motion`**: ogni transizione ha un'alternativa
  ridotta (crossfade/istantanea).
