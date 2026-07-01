import { describe, it, expect } from "vitest";
import {
  newProject,
  projectEditableEqual,
  type ProjectEditable,
} from "@/domain/projectDraft";

const editable = (over: Partial<ProjectEditable> = {}): ProjectEditable => ({
  name: "Sito",
  clientId: "c1",
  status: "active",
  description: "",
  objectives: "",
  estimatedHours: 0,
  startDate: "",
  endDate: "",
  teamIds: ["u1", "u2"],
  contactIds: [],
  subtaskDefs: [{ id: "s1", label: "Analisi" }],
  color: null,
  ...over,
});

describe("newProject", () => {
  it("progetto interno (senza cliente) con default sani", () => {
    const p = newProject({ name: "  Manutenzione  ", clientId: null }, "p1");
    expect(p).toMatchObject({
      id: "p1",
      clientId: null,
      kind: "internal",
      name: "Manutenzione", // trim
      status: "active",
      description: "",
      objectives: "",
      subtaskDefs: [],
      teamIds: [],
      contactIds: [],
    });
  });

  it("progetto di cliente: kind 'client' e clientId valorizzato", () => {
    const p = newProject({ name: "Sito", clientId: "c1" }, "p2");
    expect(p.kind).toBe("client");
    expect(p.clientId).toBe("c1");
  });
});

describe("projectEditableEqual", () => {
  it("uguali quando tutti i campi coincidono", () => {
    expect(projectEditableEqual(editable(), editable())).toBe(true);
  });

  it("diverso su uno scalare (ore stimate, date, stato…)", () => {
    expect(projectEditableEqual(editable(), editable({ estimatedHours: 8 }))).toBe(false);
    expect(projectEditableEqual(editable(), editable({ startDate: "2026-01-01" }))).toBe(false);
    expect(projectEditableEqual(editable(), editable({ color: "#f43f5e" }))).toBe(false);
  });

  it("diverso su team/referenti (id) e su sotto-attività", () => {
    expect(projectEditableEqual(editable(), editable({ teamIds: ["u1"] }))).toBe(false);
    expect(projectEditableEqual(editable(), editable({ contactIds: ["k1"] }))).toBe(false);
    expect(
      projectEditableEqual(editable(), editable({ subtaskDefs: [{ id: "s1", label: "Altro" }] })),
    ).toBe(false);
  });
});
