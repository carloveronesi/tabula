import { describe, it, expect } from "vitest";
import type { Project } from "@/data/types";
import { nameOptions, projectsFor } from "@/domain/pickers";

const proj = (p: Partial<Project> & { id: string }): Project => ({
  clientId: null,
  kind: "internal",
  name: p.id,
  status: "active",
  description: "",
  objectives: "",
  startDate: "",
  endDate: "",
  teamIds: [],
  contactIds: [],
  estimatedHours: 0,
  color: null,
  ...p,
});

const projects: Project[] = [
  proj({ id: "c1", kind: "client", clientId: "cli" }),
  proj({ id: "c2", kind: "client", clientId: "cli", status: "archived" }),
  proj({ id: "c3", kind: "client", clientId: "other" }),
  proj({ id: "i1", kind: "internal", clientId: null }),
];

describe("nameOptions", () => {
  it("mappa in {id,label}", () => {
    expect(nameOptions([{ id: "x", name: "Mario" }])).toEqual([
      { id: "x", label: "Mario" },
    ]);
  });
});

describe("projectsFor", () => {
  it("filtra per kind e cliente, nasconde gli archiviati", () => {
    const got = projectsFor(projects, { kind: "client", clientId: "cli" });
    expect(got.map((p) => p.id)).toEqual(["c1"]);
  });

  it("keepId tiene visibile l'archiviato già scelto", () => {
    const got = projectsFor(projects, {
      kind: "client",
      clientId: "cli",
      keepId: "c2",
    });
    expect(got.map((p) => p.id)).toEqual(["c1", "c2"]);
  });

  it("interni: clientId null", () => {
    const got = projectsFor(projects, { kind: "internal", clientId: null });
    expect(got.map((p) => p.id)).toEqual(["i1"]);
  });
});
