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

  it("client senza progetto, sottotipi diversi ⇒ una riga sola (label ignora il sottotipo)", () => {
    const { totals } = reportRows(
      [
        entry({ type: "client", clientId: "c1", subtypeId: "s1", startsAt: "2026-07-01T09:00:00", endsAt: "2026-07-01T10:00:00" }),
        entry({ type: "client", clientId: "c1", subtypeId: "s2", startsAt: "2026-07-02T09:00:00", endsAt: "2026-07-02T10:00:00" }),
      ],
      [], [acme], [{ id: "s1", label: "A" }, { id: "s2", label: "B" }], WH,
    );
    expect(totals).toEqual([{ client: "Acme", project: "(senza progetto)", minutes: 120 }]);
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
