import { describe, it, expect } from "vitest";
import {
  collaboratorCandidateIds,
  rankCandidatesByHistory,
} from "@/domain/collaborators";
import type { Entry, Project } from "@/data/types";

function project(over: Partial<Project> = {}): Project {
  return {
    id: "p",
    clientId: null,
    kind: "internal",
    name: "P",
    status: "active",
    description: "",
    objectives: "",
    startDate: "",
    endDate: "",
    teamIds: [],
    contactIds: [],
    estimatedHours: 0,
    color: null,
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

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e",
    startsAt: "2026-01-01T09:00:00",
    endsAt: "2026-01-01T10:00:00",
    type: "client",
    projectId: "p1",
    clientId: "c1",
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
  };
}

describe("rankCandidatesByHistory", () => {
  it("ordina per frequenza sul progetto, decrescente", () => {
    const entries = [
      entry({ collaboratorIds: ["u2", "u3"] }),
      entry({ collaboratorIds: ["u2"] }),
      entry({ collaboratorIds: ["u3"] }),
      entry({ collaboratorIds: ["u3"] }),
    ];
    // u3 ×3, u2 ×2, u1 ×0
    expect(rankCandidatesByHistory(["u1", "u2", "u3"], entries, "p1", "c1")).toEqual([
      "u3",
      "u2",
      "u1",
    ]);
  });

  it("a parità di frequenza conserva l'ordine d'ingresso (team)", () => {
    const entries = [entry({ collaboratorIds: ["u1", "u2"] })];
    expect(rankCandidatesByHistory(["u1", "u2"], entries, "p1", "c1")).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("senza progetto conta sulle entry del cliente", () => {
    const entries = [
      entry({ projectId: "p2", clientId: "c1", collaboratorIds: ["u3"] }),
      entry({ projectId: "pX", clientId: "c9", collaboratorIds: ["u2"] }),
    ];
    // solo c1 conta: u3 sale, u2 (altro cliente) resta a 0
    expect(rankCandidatesByHistory(["u2", "u3"], entries, null, "c1")).toEqual([
      "u3",
      "u2",
    ]);
  });

  it("senza progetto né cliente: nessun match, ordine invariato", () => {
    const entries = [entry({ collaboratorIds: ["u1", "u2"] })];
    expect(rankCandidatesByHistory(["u2", "u1"], entries, null, null)).toEqual([
      "u2",
      "u1",
    ]);
  });
});
