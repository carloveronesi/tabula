# Export report Excel (due fogli) — design

## Scopo

Chiudere il ciclo "registra → rivedi → fattura": dal Riepilogo, esportare un file
Excel del mese visualizzato con le ore per progetto, pronto da consultare o
allegare. Costruito sui dati già registrati, nessun nuovo backend.

## Decisioni (già confermate)

- **Formato**: un unico file Excel con **due fogli** (Giornaliero + Totale).
- **Generazione**: **SpreadsheetML 2003** (XML piano `.xls`, più `<Worksheet>`),
  zero dipendenze, riusa `triggerDownload`. Excel mostra un avviso
  "formato/estensione non corrispondono" all'apertura, poi apre correttamente coi
  due fogli. Scartate: `.xlsx` a mano (ZIP+CRC32, ~180 righe) e librerie
  (SheetJS/exceljs, dipendenza pesante). Bonus SpreadsheetML: i numeri sono
  memorizzati come `Number` e Excel li mostra secondo la locale italiana (`7,5`)
  da solo — nessuna grana separatore decimale.
- **Periodo**: il mese visualizzato (`activeDate`). Nessuna UI di date.
- **Contenuto**: **tutto** — anche le voci senza progetto, come pseudo-progetti.
- **Vista giornaliera**: formato lungo/tidy (una riga per giorno×progetto).

## Cosa produce

File `tabula-report-YYYY-MM.xls`, con due fogli:

### Foglio "Giornaliero"
Colonne: `Data | Cliente | Progetto | Ore`.
Una riga per ogni combinazione (giorno × progetto), ore sommate.
Ordine: data crescente → cliente → progetto.

### Foglio "Totale"
Colonne: `Cliente | Progetto | Ore`.
Una riga per progetto sul mese, ordinata per ore decrescenti.
Riga finale `TOTALE` (colonna Cliente/Progetto vuote, Ore = totale mese).
Quadra con `totalMin` del Riepilogo e con la somma del foglio Giornaliero.

## Regole di raggruppamento (pseudo-progetti)

Ogni entry ha una **chiave di progetto** e un'etichetta (Cliente, Progetto):

| Caso | Chiave | Cliente | Progetto |
|---|---|---|---|
| ha `projectId` (progetto cliente) | `projectId` | nome cliente del progetto | nome progetto |
| ha `projectId` (progetto interno, `clientId` null) | `projectId` | (vuoto) | nome progetto |
| `type=client`, no progetto | `client:{clientId}:{subtypeId??''}` | nome cliente | `(senza progetto)` |
| `type=internal`, no progetto | `internal:{subtypeId??''}` | (vuoto) | `Interno` + ` · <sottotipo>` se presente |
| `type=vacation` | `vacation` | (vuoto) | `Ferie` |
| `type=event` | `event:{subtypeId??''}` | (vuoto) | `Evento` + ` · <sottotipo>` se presente |

Etichetta sottotipo: da `settings.subtypes`; se non trovato, ignorata (solo la
base). Cliente non trovato → etichetta vuota (dato incoerente, non deve
bloccare l'export).

## Ore

- Minuti per entry: `workedMinutes(e, workHours)` (funzione canonica esistente).
- Aggregazione **in minuti** (interi), conversione in ore solo in cella:
  `ore = round(minuti / 60, 2)`.
- I totali sommano i **minuti** e convertono alla fine, così non driftano di
  centesimi rispetto alla somma delle righe.
- In SpreadsheetML le ore vanno in celle `ss:Type="Number"` (valore con `.`
  decimale nell'XML); l'header e le etichette sono `ss:Type="String"`.

## Architettura

Tre moduli, ognuno con un solo scopo, testabili in isolamento:

### `app/src/domain/reportRows.ts` (puro)
```ts
interface ReportRow { date?: ISODate; client: string; project: string; minutes: number }
interface ReportData { daily: ReportRow[]; totals: ReportRow[]; totalMinutes: number }

function reportRows(
  entries: Entry[],            // già filtrate sul mese dal chiamante
  projects: Project[],
  clients: Client[],
  subtypes: { id: Id; label: string }[],
  workHours: WorkHours,
): ReportData
```
Nessun DOM, nessuno store. Qui vive tutta la logica di raggruppamento, etichette
e ordinamento. `daily` ha `date`; `totals` no.

### `app/src/data/export/spreadsheetML.ts` (puro)
```ts
type Cell = string | number;
interface Sheet { name: string; headers: string[]; rows: Cell[][] }
function sheetsToXls(sheets: Sheet[]): string
```
Genera l'XML SpreadsheetML 2003 completo (`<?mso-application?>`, `<Workbook>`,
un `<Worksheet>` per foglio). Escaping di `& < >` nelle stringhe. `number` →
`ss:Type="Number"`, `string` → `ss:Type="String"`. Riusabile per altri export.

### `app/src/features/summary/exportReport.ts` (colla)
Legge gli store (`calendar.entries`, `inventory.projects/clients`,
`settings.subtypes/workHours`, `ui.activeDate`), filtra le entry sul mese
(`startsAt.slice(0,7) === monthKey`), chiama `reportRows`, mappa i due gruppi in
`Sheet[]`, chiama `sheetsToXls`, poi
`triggerDownload("tabula-report-YYYY-MM.xls", xml, "application/vnd.ms-excel")`.

### UI
Bottone "Esporta report" in fondo al pannello `MonthSummary` (già month-scoped).
Nascosto/disabilitato quando il mese è vuoto (`empty`). Stile coerente con i
bottoni esistenti (`ui/Button` o `IconButton`), sobrio, una voce di colore.

## Test (Vitest, nessun framework nuovo)

- `domain/__tests__/reportRows.test.ts`:
  - progetto cliente / progetto interno / senza progetto / ferie / evento →
    etichette e chiavi corrette;
  - due entry stesso giorno stesso progetto → una riga giornaliera sommata;
  - **quadratura**: `sum(daily.minutes) === sum(totals.minutes) === totalMinutes`;
  - ordinamento totals per minuti decrescenti.
- `data/export/__tests__/spreadsheetML.test.ts`:
  - due fogli nell'output;
  - escaping di `&`/`<`/`>`;
  - numeri emessi come `ss:Type="Number"`, stringhe come `String`.

Il modulo colla (`exportReport.ts`) non ha test dedicati: è I/O sugli store +
`triggerDownload` (già mockato altrove); la logica è tutta nei due puri.

## Fuori scope (YAGNI)

- Intervalli di date personalizzati (solo mese visualizzato).
- Colonna Tipo, filtri fatturabili (l'utente ha scelto "Tutto" secco).
- `.xlsx` reale / rimozione dell'avviso Excel (upgrade a strada B se servirà).
- Stili/formattazione celle (grassetti, larghezze): solo dati.
