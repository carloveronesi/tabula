import { describe, it, expect } from "vitest";
import { aggregateByProject } from "@/domain/projectStats";
import type { Entry, ISODateTime } from "@/data/types";

function entry(
  id: string,
  projectId: string | null,
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
    subtypeId: null,
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

describe("aggregateByProject", () => {
  it("somma ore/conteggio e ricava primo/ultimo giorno per progetto", () => {
    const m = aggregateByProject([
      entry("a", "p1", "2026-03-10T09:00:00", "2026-03-10T11:00:00"), // 120
      entry("b", "p1", "2026-06-02T14:00:00", "2026-06-02T15:00:00"), // 60
      entry("c", "p2", "2026-04-01T09:00:00", "2026-04-01T09:30:00"), // 30
      entry("d", null, "2026-04-01T09:00:00", "2026-04-01T10:00:00"), // senza progetto
    ]);

    expect(m.get("p1")).toEqual({
      totalMin: 180,
      count: 2,
      firstDate: "2026-03-10",
      lastDate: "2026-06-02",
    });
    expect(m.get("p2")).toEqual({
      totalMin: 30,
      count: 1,
      firstDate: "2026-04-01",
      lastDate: "2026-04-01",
    });
    expect(m.size).toBe(2); // le entry senza projectId sono ignorate
  });

  it("ricava primo/ultimo giorno anche con entry fuori ordine cronologico", () => {
    const m = aggregateByProject([
      entry("a", "p1", "2026-05-20T09:00:00", "2026-05-20T10:00:00"),
      entry("b", "p1", "2026-02-01T09:00:00", "2026-02-01T10:00:00"), // più vecchia, ma dopo
      entry("c", "p1", "2026-08-15T09:00:00", "2026-08-15T10:00:00"), // più recente, in mezzo
      entry("d", "p1", "2026-03-10T09:00:00", "2026-03-10T10:00:00"),
    ]);

    expect(m.get("p1")).toMatchObject({
      firstDate: "2026-02-01",
      lastDate: "2026-08-15",
      count: 4,
    });
  });

  it("vuoto → mappa vuota", () => {
    expect(aggregateByProject([]).size).toBe(0);
  });
});
