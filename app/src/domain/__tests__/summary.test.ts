import { describe, it, expect } from "vitest";
import { summarize } from "@/domain/summary";
import type { Entry, EntryType, ISODateTime } from "@/data/types";

function entry(
  id: string,
  startsAt: ISODateTime,
  endsAt: ISODateTime,
  type: EntryType,
  clientId: string | null,
  projectId: string | null = null,
): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type,
    projectId,
    clientId,
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

describe("summarize", () => {
  it("vuoto → totali a zero", () => {
    expect(summarize([])).toEqual({
      totalMin: 0,
      byType: [],
      byClient: [],
      byProject: [],
    });
  });

  it("somma le durate per progetto (ignora le entry senza projectId), desc", () => {
    const entries = [
      entry("a", "2026-06-01T09:00:00", "2026-06-01T11:00:00", "client", "c1", "p1"), // 120
      entry("b", "2026-06-01T11:00:00", "2026-06-01T12:00:00", "client", "c1", "p2"), // 60
      entry("c", "2026-06-02T09:00:00", "2026-06-02T10:00:00", "client", "c1", "p1"), // 60
      entry("d", "2026-06-02T10:00:00", "2026-06-02T11:00:00", "internal", null), // niente progetto
    ];
    expect(summarize(entries).byProject).toEqual([
      { projectId: "p1", minutes: 180 },
      { projectId: "p2", minutes: 60 },
    ]);
  });

  it("somma le durate per tipo e per cliente, ordinate desc", () => {
    const entries = [
      entry("a", "2026-06-01T09:00:00", "2026-06-01T11:00:00", "client", "c1"), // 120
      entry("b", "2026-06-01T11:00:00", "2026-06-01T12:00:00", "client", "c2"), // 60
      entry("c", "2026-06-02T09:00:00", "2026-06-02T09:30:00", "internal", null), // 30
      entry("d", "2026-06-02T10:00:00", "2026-06-02T13:00:00", "client", "c1"), // 180
    ];
    const s = summarize(entries);
    expect(s.totalMin).toBe(390);
    // c1 = 300, client tot = 360, internal = 30
    expect(s.byType).toEqual([
      { type: "client", minutes: 360 },
      { type: "internal", minutes: 30 },
    ]);
    expect(s.byClient).toEqual([
      { clientId: "c1", minutes: 300 },
      { clientId: "c2", minutes: 60 },
    ]);
  });

  it("ignora il cliente per le entry senza clientId", () => {
    const entries = [
      entry("v", "2026-06-01T09:00:00", "2026-06-01T17:00:00", "vacation", null),
    ];
    expect(summarize(entries).byClient).toEqual([]);
    expect(summarize(entries).byType).toEqual([
      { type: "vacation", minutes: 480 },
    ]);
  });
});
