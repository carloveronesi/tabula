import { describe, it, expect } from "vitest";
import { newProject } from "@/domain/projectDraft";

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
