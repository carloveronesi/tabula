import { describe, it, expect } from "vitest";
import { searchEntries } from "@/domain/search";
import type { Entry, EntryType, ISODateTime } from "@/data/types";

function entry(
  id: string,
  startsAt: ISODateTime,
  over: Partial<Entry> = {},
): Entry {
  return {
    id,
    startsAt,
    endsAt: startsAt,
    type: "client",
    projectId: null,
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
    ...over,
  };
}

const E = [
  entry("1", "2026-03-01T09:00:00", { title: "Riunione kickoff Alfa" }),
  entry("2", "2026-06-01T09:00:00", { title: "Sviluppo", notes: "fix bug ALFA" }),
  entry("3", "2026-05-01T09:00:00", { title: "Ferie", type: "vacation" as EntryType }),
];

describe("searchEntries", () => {
  it("senza query né tipo → nessun risultato", () => {
    expect(searchEntries(E, {})).toEqual([]);
  });

  it("cerca case-insensitive su titolo e note", () => {
    const r = searchEntries(E, { query: "alfa" });
    expect(r.map((e) => e.id).sort()).toEqual(["1", "2"]);
  });

  it("ordina per data decrescente", () => {
    const r = searchEntries(E, { query: "alfa" });
    expect(r.map((e) => e.id)).toEqual(["2", "1"]); // giu prima di mar
  });

  it("filtra per tipo", () => {
    const r = searchEntries(E, { type: "vacation" });
    expect(r.map((e) => e.id)).toEqual(["3"]);
  });

  it("combina query e tipo", () => {
    expect(searchEntries(E, { query: "alfa", type: "vacation" })).toEqual([]);
  });
});
