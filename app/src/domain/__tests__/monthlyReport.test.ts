import { describe, it, expect } from "vitest";
import {
  monthlyReport,
  entryMatchesFilter,
  type SummaryFilter,
} from "@/domain/monthlyReport";
import type { Entry, EntryType } from "@/data/types";
import type { WorkHours } from "@/domain/slots";

const WH: WorkHours = {
  morningStart: 540, // 09:00
  morningEnd: 720, // 12:00
  afternoonStart: 780, // 13:00
  afternoonEnd: 1020, // 17:00
}; // giornata = 180 + 240 = 420 min

function entry(over: Partial<Entry> & { date: string; start: number; end: number }): Entry {
  const hh = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const { date, start, end, ...rest } = over;
  return {
    id: `${date}-${start}`,
    startsAt: `${date}T${hh(start)}:00`,
    endsAt: `${date}T${hh(end)}:00`,
    type: "client",
    projectId: "p1",
    clientId: "c1",
    subtypeId: null,
    title: "x",
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
    ...rest,
  };
}

describe("monthlyReport", () => {
  it("totali e giorni attivi su tutte le entry", () => {
    const r = monthlyReport(
      [
        entry({ date: "2026-06-01", start: 540, end: 600 }),
        entry({ date: "2026-06-02", start: 540, end: 660 }),
      ],
      [],
      WH,
      30,
    );
    expect(r.totalMin).toBe(60 + 120);
    expect(r.activeDays).toBe(2);
  });

  it("copertura: un giorno è 'compilato' solo se ogni slot lavorativo è coperto", () => {
    // 2026-06-01 coperto interamente (09–12 + 13–17); 2026-06-02 solo mattino
    const full = [
      entry({ date: "2026-06-01", start: 540, end: 720 }),
      entry({ date: "2026-06-01", start: 780, end: 1020 }),
      entry({ date: "2026-06-02", start: 540, end: 720 }),
    ];
    const r = monthlyReport(full, ["2026-06-01", "2026-06-02"], WH, 30);
    expect(r.coverage.workingDays).toBe(2);
    expect(r.coverage.filledDays).toBe(1);
    expect(r.coverage.pct).toBe(50);
    expect(r.coverage.expectedMin).toBe(2 * 420);
    expect(r.coverage.registeredMin).toBe(420 + 180);
  });

  it("copertura nulla senza giorni feriali trascorsi", () => {
    const r = monthlyReport([entry({ date: "2026-06-01", start: 540, end: 720 })], [], WH, 30);
    expect(r.coverage).toMatchObject({ workingDays: 0, filledDays: 0, pct: 0, expectedMin: 0 });
  });

  it("ripartizione per cliente con scomposizione per sottotipo, ordinata", () => {
    const r = monthlyReport(
      [
        entry({ date: "2026-06-01", start: 540, end: 600, clientId: "c1", subtypeId: "dev" }),
        entry({ date: "2026-06-01", start: 600, end: 720, clientId: "c1", subtypeId: "call" }),
        entry({ date: "2026-06-02", start: 540, end: 570, clientId: "c2", subtypeId: null }),
      ],
      [],
      WH,
      30,
    );
    expect(r.byClient.map((c) => c.clientId)).toEqual(["c1", "c2"]); // c1 (180) > c2 (30)
    expect(r.byClient[0].minutes).toBe(180);
    expect(r.byClient[0].bySubtype).toEqual([
      { subtypeId: "call", minutes: 120 },
      { subtypeId: "dev", minutes: 60 },
    ]);
  });

  it("altri tipi (interno/ferie/evento) separati dai clienti", () => {
    const r = monthlyReport(
      [
        entry({ date: "2026-06-01", start: 540, end: 600, type: "client", clientId: "c1" }),
        entry({ date: "2026-06-01", start: 600, end: 720, type: "internal", clientId: null, subtypeId: "admin" }),
        entry({ date: "2026-06-02", start: 540, end: 780, type: "vacation", clientId: null }),
      ],
      [],
      WH,
      30,
    );
    expect(r.byClient).toHaveLength(1);
    expect(r.byOtherType.map((t) => t.type)).toEqual<EntryType[]>(["vacation", "internal"]); // 240 > 120
    const internal = r.byOtherType.find((t) => t.type === "internal");
    expect(internal?.bySubtype).toEqual([{ subtypeId: "admin", minutes: 120 }]);
  });
});

describe("entryMatchesFilter", () => {
  const e = (over: Partial<Entry>): Entry =>
    entry({ date: "2026-06-01", start: 540, end: 600, ...over });

  it("filtro per cliente", () => {
    const f: SummaryFilter = { kind: "client", clientId: "c1" };
    expect(entryMatchesFilter(e({ clientId: "c1" }), f)).toBe(true);
    expect(entryMatchesFilter(e({ clientId: "c2" }), f)).toBe(false);
  });

  it("filtro per tipo", () => {
    const f: SummaryFilter = { kind: "type", type: "internal" };
    expect(entryMatchesFilter(e({ type: "internal" }), f)).toBe(true);
    expect(entryMatchesFilter(e({ type: "client" }), f)).toBe(false);
  });
});
