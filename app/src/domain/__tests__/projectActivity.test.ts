import { describe, it, expect } from "vitest";
import { projectActivity } from "@/domain/projectActivity";
import type { Entry, ISODateTime } from "@/data/types";

function entry(
  id: string,
  projectId: string | null,
  subtypeId: string | null,
  startsAt: ISODateTime,
  endsAt: ISODateTime,
): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type: "client",
    projectId,
    clientId: null,
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

const WH = { morningStart: 540, morningEnd: 780, afternoonStart: 840, afternoonEnd: 1080 };

describe("projectActivity", () => {
  it("distribuisce le ore per mese riempiendo i buchi e ignora altri progetti", () => {
    const a = projectActivity(
      [
        entry("a", "p1", "s1", "2026-03-10T09:00:00", "2026-03-10T11:00:00"), // mar, 120
        entry("b", "p1", "s1", "2026-05-02T14:00:00", "2026-05-02T15:00:00"), // mag, 60
        entry("c", "p2", "s1", "2026-04-01T09:00:00", "2026-04-01T10:00:00"), // altro progetto
      ],
      "p1",
      WH,
    );
    // Da marzo a maggio: aprile è un buco per p1 (0), ma il mese ha lavoro (p2).
    expect(a.byMonth).toEqual([
      { month: "2026-03", minutes: 120, total: 120 },
      { month: "2026-04", minutes: 0, total: 60 }, // solo p2 quel mese
      { month: "2026-05", minutes: 60, total: 60 },
    ]);
  });

  it("il totale del mese somma tutti i progetti ma esclude le ferie", () => {
    const a = projectActivity(
      [
        entry("a", "p1", "s1", "2026-03-10T09:00:00", "2026-03-10T10:00:00"), // p1 60
        entry("b", "p2", "s1", "2026-03-11T09:00:00", "2026-03-11T10:00:00"), // altro prog 60
        { ...entry("f", "p3", "s1", "2026-03-12T09:00:00", "2026-03-12T13:00:00"), type: "vacation" }, // ferie: esclusa
      ],
      "p1",
      WH,
    );
    // total = 60 (p1) + 60 (p2), la ferie non conta; quota p1 = 50%.
    expect(a.byMonth).toEqual([{ month: "2026-03", minutes: 60, total: 120 }]);
  });

  it("attraversa il confine d'anno", () => {
    const a = projectActivity(
      [
        entry("a", "p1", null, "2026-11-10T09:00:00", "2026-11-10T10:00:00"),
        entry("b", "p1", null, "2027-01-10T09:00:00", "2027-01-10T10:00:00"),
      ],
      "p1",
      WH,
    );
    expect(a.byMonth.map((m) => m.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("somma per sottotipo, decrescente, con null incluso", () => {
    const a = projectActivity(
      [
        entry("a", "p1", "s1", "2026-03-10T09:00:00", "2026-03-10T10:00:00"), // s1 60
        entry("b", "p1", "s2", "2026-03-11T09:00:00", "2026-03-11T11:00:00"), // s2 120
        entry("c", "p1", null, "2026-03-12T09:00:00", "2026-03-12T09:30:00"), // null 30
      ],
      "p1",
      WH,
    );
    expect(a.bySubtype).toEqual([
      { subtypeId: "s2", minutes: 120 },
      { subtypeId: "s1", minutes: 60 },
      { subtypeId: null, minutes: 30 },
    ]);
  });

  it("nessuna entry del progetto → vuoto", () => {
    const a = projectActivity([], "p1", WH);
    expect(a.byMonth).toEqual([]);
    expect(a.bySubtype).toEqual([]);
  });
});
