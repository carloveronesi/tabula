# Export report Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere al Riepilogo un export del mese visualizzato in un file Excel con due fogli (Giornaliero + Totale).

**Architecture:** Due funzioni pure (`reportRows` aggrega le entry del mese in righe giornaliere/totali; `sheetsToXls` serializza fogli in SpreadsheetML 2003) più un modulo colla che legge gli store e scarica il file via il `triggerDownload` esistente. Un bottone nel pannello `MonthSummary` avvia l'export.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest. Nessuna nuova dipendenza (SpreadsheetML 2003 è XML piano).

## Global Constraints

- Codice in `app/`; comandi `npm`/test da `app/`.
- Nessuna nuova dipendenza npm.
- Import alias `@/` → `app/src/`.
- Funzione minuti di una entry: `workedMinutes(entry, workHours)` da `@/domain/time`.
- `WorkHours` = `{ morningStart, morningEnd, afternoonStart, afternoonEnd }` (minuti dal mezzanotte) da `@/domain/slots`.
- `settings.subtypes` ha forma `{ id: Id; label: string }[]`.
- Nomi file/copy in italiano naturale, coerenti col prodotto.

---

### Task 1: Serializzatore SpreadsheetML (`sheetsToXls`)

**Files:**
- Create: `app/src/data/export/spreadsheetML.ts`
- Test: `app/src/data/export/__tests__/spreadsheetML.test.ts`

**Interfaces:**
- Consumes: niente.
- Produces:
  ```ts
  type Cell = string | number;
  interface Sheet { name: string; headers: string[]; rows: Cell[][] }
  function sheetsToXls(sheets: Sheet[]): string
  ```

- [ ] **Step 1: Scrivi il test che fallisce**

`app/src/data/export/__tests__/spreadsheetML.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sheetsToXls } from "../spreadsheetML";

describe("sheetsToXls", () => {
  it("emette un Worksheet per foglio, col nome", () => {
    const xml = sheetsToXls([
      { name: "Giornaliero", headers: ["h"], rows: [] },
      { name: "Totale", headers: ["h"], rows: [] },
    ]);
    expect(xml.match(/<Worksheet/g)).toHaveLength(2);
    expect(xml).toContain('ss:Name="Giornaliero"');
    expect(xml).toContain('ss:Name="Totale"');
  });

  it("numeri come Number, stringhe come String", () => {
    const xml = sheetsToXls([{ name: "S", headers: ["x"], rows: [["ciao", 7.5]] }]);
    expect(xml).toContain('ss:Type="Number">7.5<');
    expect(xml).toContain('ss:Type="String">ciao<');
  });

  it("fa escaping di & < >", () => {
    const xml = sheetsToXls([{ name: "S", headers: ["h"], rows: [["a & b < c > d"]] }]);
    expect(xml).toContain("a &amp; b &lt; c &gt; d");
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run (da `app/`): `npx vitest run src/data/export/__tests__/spreadsheetML.test.ts`
Expected: FAIL — `sheetsToXls` non esiste.

- [ ] **Step 3: Implementa il modulo**

`app/src/data/export/spreadsheetML.ts`:
```ts
/**
 * Serializza fogli tabellari nel formato SpreadsheetML 2003 (XML piano che Excel
 * apre con più fogli). Zero dipendenze: solo generazione di stringhe. I numeri
 * finiscono in celle `Number` (Excel li mostra secondo la locale dell'utente),
 * le stringhe in celle `String` con escaping di `& < >`.
 */
export type Cell = string | number;

export interface Sheet {
  name: string;
  headers: string[];
  rows: Cell[][];
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function cellXml(c: Cell): string {
  return typeof c === "number"
    ? `<Cell><Data ss:Type="Number">${c}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`;
}

function rowXml(cells: Cell[]): string {
  return `<Row>${cells.map(cellXml).join("")}</Row>`;
}

function sheetXml(s: Sheet): string {
  const rows = [s.headers, ...s.rows].map(rowXml).join("");
  return `<Worksheet ss:Name="${esc(s.name)}"><Table>${rows}</Table></Worksheet>`;
}

export function sheetsToXls(sheets: Sheet[]): string {
  return (
    `<?xml version="1.0"?>\n` +
    `<?mso-application progid="Excel.Sheet"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"` +
    ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n` +
    sheets.map(sheetXml).join("\n") +
    `\n</Workbook>`
  );
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run (da `app/`): `npx vitest run src/data/export/__tests__/spreadsheetML.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add app/src/data/export/spreadsheetML.ts app/src/data/export/__tests__/spreadsheetML.test.ts
git commit -m "feat(export): serializzatore SpreadsheetML 2003 (fogli multipli)"
```

---

### Task 2: Aggregatore righe report (`reportRows`)

**Files:**
- Create: `app/src/domain/reportRows.ts`
- Test: `app/src/domain/__tests__/reportRows.test.ts`

**Interfaces:**
- Consumes: `workedMinutes` da `@/domain/time`, `WorkHours` da `@/domain/slots`, tipi `Entry`/`Project`/`Client`/`Id`/`ISODate` da `@/data/types`.
- Produces:
  ```ts
  interface ReportRow { date?: ISODate; client: string; project: string; minutes: number }
  interface ReportData { daily: ReportRow[]; totals: ReportRow[]; totalMinutes: number }
  function reportRows(
    entries: Entry[], projects: Project[], clients: Client[],
    subtypes: { id: Id; label: string }[], workHours: WorkHours,
  ): ReportData
  ```

- [ ] **Step 1: Scrivi il test che fallisce**

`app/src/domain/__tests__/reportRows.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import type { Client, Entry, Project } from "@/data/types";
import type { WorkHours } from "@/domain/slots";
import { reportRows } from "@/domain/reportRows";

// workHours senza pausa pranzo (afternoonStart <= morningEnd ⇒ minuti = durata piena)
const WH: WorkHours = { morningStart: 0, morningEnd: 0, afternoonStart: 0, afternoonEnd: 0 };

function entry(p: Partial<Entry>): Entry {
  return {
    id: "e", startsAt: "2026-07-01T09:00:00", endsAt: "2026-07-01T10:00:00",
    type: "client", projectId: null, clientId: null, subtypeId: null,
    title: "", collaboratorIds: [], contactIds: [], notes: "", blockers: "",
    nextSteps: "", links: [], milestone: null, createdAt: 0, updatedAt: 0, ...p,
  };
}
const acme: Client = { id: "c1", name: "Acme", color: null, createdAt: 0 };
function project(p: Partial<Project>): Project {
  return {
    id: "p1", clientId: "c1", kind: "client", name: "Restyling", status: "active",
    description: "", objectives: "", startDate: "", endDate: "", teamIds: [],
    contactIds: [], estimatedHours: 0, color: null, ...p,
  };
}

describe("reportRows", () => {
  it("progetto cliente: cliente e nome progetto", () => {
    const { totals } = reportRows(
      [entry({ projectId: "p1", clientId: "c1" })], [project({})], [acme], [], WH,
    );
    expect(totals).toEqual([{ client: "Acme", project: "Restyling", minutes: 60 }]);
  });

  it("progetto interno: cliente vuoto", () => {
    const { totals } = reportRows(
      [entry({ type: "internal", projectId: "pi" })],
      [project({ id: "pi", clientId: null, kind: "internal", name: "Sito interno" })],
      [], [], WH,
    );
    expect(totals[0]).toEqual({ client: "", project: "Sito interno", minutes: 60 });
  });

  it("pseudo-progetti: ferie, interno con sottotipo, senza progetto", () => {
    const { totals } = reportRows(
      [
        entry({ type: "vacation" }),
        entry({ type: "internal", subtypeId: "s1" }),
        entry({ type: "client", clientId: "c1" }),
      ],
      [], [acme], [{ id: "s1", label: "Formazione" }], WH,
    );
    const byProject = Object.fromEntries(totals.map((r) => [r.project, r.client]));
    expect(byProject).toEqual({
      "Ferie": "",
      "Interno · Formazione": "",
      "(senza progetto)": "Acme",
    });
  });

  it("stesso giorno stesso progetto ⇒ una riga giornaliera sommata", () => {
    const { daily } = reportRows(
      [
        entry({ projectId: "p1", clientId: "c1", startsAt: "2026-07-01T09:00:00", endsAt: "2026-07-01T10:00:00" }),
        entry({ projectId: "p1", clientId: "c1", startsAt: "2026-07-01T14:00:00", endsAt: "2026-07-01T15:30:00" }),
      ],
      [project({})], [acme], [], WH,
    );
    expect(daily).toEqual([{ date: "2026-07-01", client: "Acme", project: "Restyling", minutes: 150 }]);
  });

  it("quadratura: somma daily == somma totals == totalMinutes", () => {
    const { daily, totals, totalMinutes } = reportRows(
      [
        entry({ startsAt: "2026-07-01T09:00:00", endsAt: "2026-07-01T11:00:00", type: "vacation" }),
        entry({ startsAt: "2026-07-02T09:00:00", endsAt: "2026-07-02T10:00:00", type: "internal" }),
      ],
      [], [], [], WH,
    );
    const sum = (rs: { minutes: number }[]) => rs.reduce((a, r) => a + r.minutes, 0);
    expect(totalMinutes).toBe(180);
    expect(sum(daily)).toBe(180);
    expect(sum(totals)).toBe(180);
  });

  it("totals ordinati per minuti decrescenti", () => {
    const { totals } = reportRows(
      [
        entry({ type: "vacation", startsAt: "2026-07-01T09:00:00", endsAt: "2026-07-01T10:00:00" }),
        entry({ type: "internal", startsAt: "2026-07-02T09:00:00", endsAt: "2026-07-02T13:00:00" }),
      ],
      [], [], [], WH,
    );
    expect(totals.map((r) => r.project)).toEqual(["Interno", "Ferie"]);
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run (da `app/`): `npx vitest run src/domain/__tests__/reportRows.test.ts`
Expected: FAIL — `reportRows` non esiste.

- [ ] **Step 3: Implementa il modulo**

`app/src/domain/reportRows.ts`:
```ts
import type { Client, Entry, Id, ISODate, Project } from "@/data/types";
import type { WorkHours } from "@/domain/slots";
import { workedMinutes } from "@/domain/time";

/**
 * Aggrega le entry di un periodo in righe per l'export Excel. Logica pura: chi
 * chiama passa le entry già filtrate sul mese. Le voci senza progetto diventano
 * pseudo-progetti (Ferie, Evento, Interno · <sottotipo>, o "(senza progetto)"
 * sotto il cliente). `daily` ha una riga per (giorno × progetto); `totals` una
 * riga per progetto sull'intero periodo.
 */
export interface ReportRow {
  date?: ISODate;
  client: string;
  project: string;
  minutes: number;
}

export interface ReportData {
  daily: ReportRow[];
  totals: ReportRow[];
  totalMinutes: number;
}

function labelFor(
  e: Entry,
  projectById: Map<Id, Project>,
  clientById: Map<Id, Client>,
  subtypeById: Map<Id, string>,
): { key: string; client: string; project: string } {
  const sub = e.subtypeId ? subtypeById.get(e.subtypeId) : undefined;
  const suffix = sub ? ` · ${sub}` : "";

  if (e.projectId) {
    const p = projectById.get(e.projectId);
    const client = p?.clientId ? clientById.get(p.clientId)?.name ?? "" : "";
    return { key: e.projectId, client, project: p?.name ?? "" };
  }
  switch (e.type) {
    case "client": {
      const client = e.clientId ? clientById.get(e.clientId)?.name ?? "" : "";
      return { key: `client:${e.clientId ?? ""}:${e.subtypeId ?? ""}`, client, project: "(senza progetto)" };
    }
    case "internal":
      return { key: `internal:${e.subtypeId ?? ""}`, client: "", project: `Interno${suffix}` };
    case "vacation":
      return { key: "vacation", client: "", project: "Ferie" };
    case "event":
      return { key: `event:${e.subtypeId ?? ""}`, client: "", project: `Evento${suffix}` };
  }
}

export function reportRows(
  entries: Entry[],
  projects: Project[],
  clients: Client[],
  subtypes: { id: Id; label: string }[],
  workHours: WorkHours,
): ReportData {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const subtypeById = new Map(subtypes.map((s) => [s.id, s.label]));

  const dailyMap = new Map<string, ReportRow>();
  const totalsMap = new Map<string, ReportRow>();
  let totalMinutes = 0;

  for (const e of entries) {
    const min = workedMinutes(e, workHours);
    if (min <= 0) continue;
    totalMinutes += min;
    const { key, client, project } = labelFor(e, projectById, clientById, subtypeById);
    const date = e.startsAt.slice(0, 10);

    const dKey = `${date}|${key}`;
    const d = dailyMap.get(dKey);
    if (d) d.minutes += min;
    else dailyMap.set(dKey, { date, client, project, minutes: min });

    const t = totalsMap.get(key);
    if (t) t.minutes += min;
    else totalsMap.set(key, { client, project, minutes: min });
  }

  const daily = [...dailyMap.values()].sort(
    (a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "") ||
      a.client.localeCompare(b.client) ||
      a.project.localeCompare(b.project),
  );
  const totals = [...totalsMap.values()].sort((a, b) => b.minutes - a.minutes);

  return { daily, totals, totalMinutes };
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run (da `app/`): `npx vitest run src/domain/__tests__/reportRows.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/reportRows.ts app/src/domain/__tests__/reportRows.test.ts
git commit -m "feat(export): aggregatore righe report per progetto (giornaliero + totale)"
```

---

### Task 3: Colla export + bottone nel Riepilogo

**Files:**
- Create: `app/src/features/summary/exportReport.ts`
- Modify: `app/src/features/summary/MonthSummary.tsx` (import + bottone in fondo alle `sections`)

**Interfaces:**
- Consumes: `reportRows`/`ReportRow` (Task 2), `sheetsToXls`/`Sheet` (Task 1), `triggerDownload` da `@/data/export/triggerDownload`, `isoDate` da `@/domain/calendarNav`, gli store `useCalendarStore`/`useInventoryStore`/`useSettingsStore`/`useUiStore`.
- Produces: `function exportMonthReport(): void`.

- [ ] **Step 1: Implementa il modulo colla**

`app/src/features/summary/exportReport.ts`:
```ts
/**
 * Colla dell'export: legge gli store, filtra le entry sul mese visualizzato,
 * costruisce i due fogli (Giornaliero + Totale) e scarica un file Excel
 * (SpreadsheetML 2003). Nessuna logica di dominio qui: sta tutta in reportRows.
 */
import { isoDate } from "@/domain/calendarNav";
import { reportRows } from "@/domain/reportRows";
import { sheetsToXls, type Sheet } from "@/data/export/spreadsheetML";
import { triggerDownload } from "@/data/export/triggerDownload";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useUiStore } from "@/store";

const hours = (min: number): number => Math.round((min / 60) * 100) / 100;

export function exportMonthReport(): void {
  const { entries } = useCalendarStore.getState();
  const { projects, clients } = useInventoryStore.getState();
  const { settings } = useSettingsStore.getState();
  const activeDate = useUiStore.getState().activeDate;

  const monthKey = isoDate(activeDate).slice(0, 7);
  const monthEntries = entries.filter((e) => e.startsAt.slice(0, 7) === monthKey);
  const { daily, totals, totalMinutes } = reportRows(
    monthEntries, projects, clients, settings.subtypes, settings.workHours,
  );

  const dailySheet: Sheet = {
    name: "Giornaliero",
    headers: ["Data", "Cliente", "Progetto", "Ore"],
    rows: daily.map((r) => [r.date ?? "", r.client, r.project, hours(r.minutes)]),
  };
  const totalSheet: Sheet = {
    name: "Totale",
    headers: ["Cliente", "Progetto", "Ore"],
    rows: [
      ...totals.map((r) => [r.client, r.project, hours(r.minutes)]),
      ["TOTALE", "", hours(totalMinutes)],
    ],
  };

  triggerDownload(
    `tabula-report-${monthKey}.xls`,
    sheetsToXls([dailySheet, totalSheet]),
    "application/vnd.ms-excel",
  );
}
```

- [ ] **Step 2: Aggiungi import in `MonthSummary.tsx`**

In cima a `app/src/features/summary/MonthSummary.tsx`, tra gli import esistenti, aggiungi:
```ts
import { Button } from "@/ui/Button";
import { exportMonthReport } from "./exportReport";
```

- [ ] **Step 3: Aggiungi il bottone in fondo alle `sections`**

In `MonthSummary.tsx`, dentro il frammento `sections`, subito **dopo** il blocco `{report.byOtherType.length > 0 && ( … )}` e prima della chiusura `</>`, inserisci:
```tsx
      <Button
        variant="subtle"
        size="sm"
        onClick={exportMonthReport}
        className="mt-1 w-full"
      >
        Esporta report
      </Button>
```

- [ ] **Step 4: Typecheck + suite completa**

Run (da `app/`): `npm run typecheck && npm test`
Expected: typecheck pulito; tutti i test passano (inclusi i nuovi e i MonthSummary esistenti).

- [ ] **Step 5: Verifica manuale (facoltativa ma consigliata)**

Run (da `app/`): `npm run dev`, apri il Riepilogo su un mese con attività, clicca "Esporta report", apri il `.xls` scaricato in Excel/LibreOffice: due fogli (Giornaliero, Totale), ore in formato locale, riga TOTALE che quadra col totale del mese. (Excel mostra un avviso formato/estensione: atteso, apri comunque.)

- [ ] **Step 6: Commit**

```bash
git add app/src/features/summary/exportReport.ts app/src/features/summary/MonthSummary.tsx
git commit -m "feat(summary): bottone Esporta report (Excel due fogli) nel Riepilogo"
```

---

## Self-Review

**Spec coverage:**
- Formato Excel due fogli / SpreadsheetML → Task 1 + Task 3.
- Aggregazione per progetto, pseudo-progetti, ore in minuti→decimali, quadratura → Task 2.
- Periodo = mese visualizzato → Task 3 (filtro `monthKey`).
- Bottone nel Riepilogo → Task 3.
- Test reportRows + spreadsheetML → Task 2 + Task 1.

**Placeholder scan:** nessun TODO/TBD; ogni step di codice ha il codice completo.

**Type consistency:** `Sheet`/`Cell` (Task 1) usati in Task 3; `ReportRow`/`ReportData`/`reportRows` (Task 2) usati in Task 3; `hours()` locale in Task 3. `settings.subtypes` `{id,label}[]` coerente con la firma di `reportRows`. `useUiStore` da `@/store`, `useCalendarStore`/`useInventoryStore`/`useSettingsStore` dai rispettivi moduli (come in MonthSummary).

## Fuori scope (dal design)

Intervalli di date personalizzati; colonna Tipo/filtro fatturabili; `.xlsx` reale; stili di cella.
