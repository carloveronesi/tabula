import { describe, it, expect } from "vitest";
import { collaboratorCandidateIds } from "@/domain/collaborators";
import type { Project } from "@/data/types";

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p",
    clientId: null,
    kind: "internal",
    name: "P",
    subtaskDefs: [],
    status: "active",
    description: "",
    objectives: "",
    startDate: "",
    endDate: "",
    teamIds: [],
    contactIds: [],
    estimatedHours: 0,
    ...over,
  };
}

const PROJECTS: Project[] = [
  project({ id: "p1", clientId: "c1", teamIds: ["u1", "u2"] }),
  project({ id: "p2", clientId: "c1", teamIds: ["u2", "u3"] }),
  project({ id: "p3", clientId: "c2", teamIds: ["u9"] }),
];

describe("collaboratorCandidateIds", () => {
  it("con un progetto: ritorna il suo team", () => {
    expect(collaboratorCandidateIds(PROJECTS, "p1", "c1")).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("con solo il cliente: unione dei team dei suoi progetti (dedup, ordine stabile)", () => {
    expect(collaboratorCandidateIds(PROJECTS, null, "c1")).toEqual([
      "u1",
      "u2",
      "u3",
    ]);
  });

  it("non mischia i team di clienti diversi", () => {
    expect(collaboratorCandidateIds(PROJECTS, null, "c2")).toEqual(["u9"]);
  });

  it("senza cliente né progetto: nessun candidato", () => {
    expect(collaboratorCandidateIds(PROJECTS, null, null)).toEqual([]);
  });

  it("il progetto ha la precedenza sul cliente", () => {
    expect(collaboratorCandidateIds(PROJECTS, "p3", "c1")).toEqual(["u9"]);
  });
});
