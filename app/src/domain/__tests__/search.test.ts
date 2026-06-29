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

  const F = [
    entry("a", "2026-01-10T09:00:00", { clientId: "c1", projectId: "p1" }),
    entry("b", "2026-02-10T09:00:00", { clientId: "c1", projectId: "p2" }),
    entry("c", "2026-03-10T09:00:00", { clientId: "c2", projectId: "p3" }),
  ];

  it("filtra per cliente (da solo attiva la ricerca)", () => {
    const r = searchEntries(F, { clientId: "c1" });
    expect(r.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });

  it("filtra per progetto", () => {
    expect(searchEntries(F, { projectId: "p3" }).map((e) => e.id)).toEqual(["c"]);
  });

  it("filtra per intervallo di date (estremi inclusi, sul giorno di inizio)", () => {
    const r = searchEntries(F, { from: "2026-02-01", to: "2026-03-31" });
    expect(r.map((e) => e.id)).toEqual(["c", "b"]); // ordine decrescente
  });

  it("from senza to: dal giorno in poi", () => {
    expect(searchEntries(F, { from: "2026-02-10" }).map((e) => e.id)).toEqual([
      "c",
      "b",
    ]);
  });

  it("to senza from: fino al giorno incluso", () => {
    expect(searchEntries(F, { to: "2026-02-10" }).map((e) => e.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("combina cliente e query", () => {
    const r = searchEntries(
      [
        entry("x", "2026-01-01T09:00:00", { clientId: "c1", title: "deploy" }),
        entry("y", "2026-01-02T09:00:00", { clientId: "c2", title: "deploy" }),
      ],
      { clientId: "c1", query: "deploy" },
    );
    expect(r.map((e) => e.id)).toEqual(["x"]);
  });

  const G = [
    entry("a", "2026-01-10T09:00:00", { collaboratorIds: ["u1", "u2"] }),
    entry("b", "2026-02-10T09:00:00", { collaboratorIds: ["u2"], contactIds: ["k1"] }),
    entry("c", "2026-03-10T09:00:00", { contactIds: ["k1", "k2"] }),
  ];

  it("filtra per collaboratore (da solo attiva la ricerca)", () => {
    expect(searchEntries(G, { collaboratorId: "u2" }).map((e) => e.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("filtra per referente", () => {
    expect(searchEntries(G, { contactId: "k1" }).map((e) => e.id)).toEqual([
      "c",
      "b",
    ]);
  });

  it("collaboratore assente: nessun risultato", () => {
    expect(searchEntries(G, { collaboratorId: "zzz" })).toEqual([]);
  });
});
