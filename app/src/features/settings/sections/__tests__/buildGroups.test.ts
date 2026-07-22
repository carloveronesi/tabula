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
    { id: "a", name: "Anna" },
    { id: "b", name: "Bruno" },
    { id: "c", name: "Carla" },
  ],
  pickIds: (e: Entry) => e.collaboratorIds,
  groupKeyOf: (e: Entry) => e.clientId ?? "Interno",
  fallbackOf: () => "Senza attività",
};

describe("buildGroups", () => {
  const entries = [
    entry({ id: "1", clientId: "Acme", collaboratorIds: ["a", "b"] }),
    entry({ id: "2", clientId: null, projectId: "P1", collaboratorIds: ["a"] }),
  ];

  it("raggruppa per contesto e mette in coda i gruppi 'senza'", () => {
    const g = buildGroups({ ...base, entries, query: "", projectId: null });
    expect(g.map((x) => x.label)).toEqual(["Acme", "Interno", "Senza attività"]);
    expect(g[0].ids).toEqual(["a", "b"]); // Anna, Bruno sotto Acme
    expect(g[2].ids).toEqual(["c"]); // Carla mai usata
  });

  it("cerca per nome (case-insensitive)", () => {
    const g = buildGroups({ ...base, entries, query: "car", projectId: null });
    expect(g).toEqual([{ label: "Senza attività", ids: ["c"] }]);
  });

  it("filtra per progetto: solo le entry di quel progetto contano, niente fallback", () => {
    const g = buildGroups({ ...base, entries, query: "", projectId: "P1" });
    expect(g).toEqual([{ label: "Interno", ids: ["a"] }]);
  });
});
