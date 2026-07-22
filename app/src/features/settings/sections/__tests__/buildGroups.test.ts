import { describe, expect, it } from "vitest";
import type { Entry } from "@/data/types";
import { buildGroups } from "../PeopleSettings";

const entry = (over: Partial<Entry>): Entry =>
  ({
    id: "e",
    startsAt: "",
    endsAt: "",
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: "",
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
  }) as Entry;

const base = {
  entities: [
    { id: "e", name: "Élodie" },
    { id: "a", name: "Anna" },
    { id: "b", name: "Bruno" },
    { id: "1", name: "1° collaboratore" },
  ],
  pickIds: (e: Entry) => e.collaboratorIds,
};

describe("buildGroups", () => {
  it("indice a rubrica: iniziale accento-insensibile, «#» in coda", () => {
    const g = buildGroups({ ...base, entries: [], query: "", projectId: null });
    expect(g.map((x) => x.label)).toEqual(["A", "B", "E", "#"]);
    expect(g[0].ids).toEqual(["a"]); // Anna
    expect(g[2].ids).toEqual(["e"]); // Élodie sotto E, non accento
    expect(g[3].ids).toEqual(["1"]); // non-lettera in coda
  });

  it("cerca per nome (case-insensitive)", () => {
    const g = buildGroups({ ...base, entries: [], query: "ann", projectId: null });
    expect(g).toEqual([{ label: "A", ids: ["a"] }]);
  });

  it("filtra per progetto: solo chi compare in un'attività di quel progetto", () => {
    const entries = [entry({ projectId: "P1", collaboratorIds: ["a", "b"] })];
    const g = buildGroups({ ...base, entries, query: "", projectId: "P1" });
    expect(g.map((x) => x.label)).toEqual(["A", "B"]);
  });
});
