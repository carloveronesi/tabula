import { describe, it, expect } from "vitest";
import { dayBreakdown, type BreakdownNames } from "@/domain/dayBreakdown";
import type { Entry, EntryType, ISODateTime } from "@/data/types";

function entry(
  id: string,
  startsAt: ISODateTime,
  endsAt: ISODateTime,
  type: EntryType,
  clientId: string | null = null,
  subtypeId: string | null = null,
): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type,
    projectId: null,
    clientId,
    subtypeId,
    title: id,
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

const MAPS = {
  clientColors: { acme: "#6366f1" },
  internalColors: { form: "#f43f5e" },
};
const NAMES: BreakdownNames = {
  clientName: (id) => (id === "acme" ? "Acme S.p.A." : "?"),
  subtypeLabel: (id) => (id === "form" ? "Formazione" : "?"),
};

describe("dayBreakdown", () => {
  it("giorno vuoto → totali a zero, nessuna riga", () => {
    expect(dayBreakdown([], MAPS, NAMES)).toEqual({
      totalMin: 0,
      count: 0,
      rows: [],
    });
  });

  it("somma i minuti per cliente e usa nome + colore del cliente", () => {
    const entries = [
      entry("a", "2026-06-18T09:30:00", "2026-06-18T12:00:00", "client", "acme"),
      entry("b", "2026-06-18T14:00:00", "2026-06-18T15:00:00", "client", "acme"),
    ];
    const out = dayBreakdown(entries, MAPS, NAMES);
    expect(out.totalMin).toBe(210);
    expect(out.count).toBe(2);
    expect(out.rows).toEqual([
      { key: "client:acme", label: "Acme S.p.A.", color: "#6366f1", minutes: 210 },
    ]);
  });

  it("raggruppa interne per sottotipo e tiene gruppi distinti", () => {
    const entries = [
      entry("a", "2026-06-18T09:00:00", "2026-06-18T10:00:00", "client", "acme"),
      entry("b", "2026-06-18T15:30:00", "2026-06-18T17:30:00", "internal", null, "form"),
    ];
    const out = dayBreakdown(entries, MAPS, NAMES);
    // ordinate per minuti decrescenti: Formazione (120) prima di Acme (60)
    expect(out.rows.map((r) => [r.label, r.minutes])).toEqual([
      ["Formazione", 120],
      ["Acme S.p.A.", 60],
    ]);
    expect(out.rows[0].color).toBe("#f43f5e");
  });

  it("evento/ferie senza riferimento → gruppo per tipo, tinta del tipo", () => {
    const entries = [
      entry("e", "2026-06-18T09:00:00", "2026-06-18T09:30:00", "event"),
    ];
    const out = dayBreakdown(entries, MAPS, NAMES);
    expect(out.rows).toEqual([
      { key: "type:event", label: "Evento", color: "#ec4899", minutes: 30 },
    ]);
  });

  it("interno e cliente senza riferimento → colori distinti", () => {
    const entries = [
      entry("i", "2026-06-18T09:00:00", "2026-06-18T10:00:00", "internal"),
      entry("c", "2026-06-18T10:00:00", "2026-06-18T11:00:00", "client"),
    ];
    const [a, b] = dayBreakdown(entries, MAPS, NAMES).rows;
    expect(a.color).not.toBe(b.color);
  });
});
