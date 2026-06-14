import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { useInventoryStore } from "@/store/inventory";
import type { Client, Project } from "@/data/types";

function client(id: string, name: string): Client {
  return { id, name, color: null, createdAt: 0 };
}

function project(id: string, clientId: string | null, name: string): Project {
  return {
    id,
    clientId,
    kind: clientId ? "client" : "internal",
    name,
    subtaskDefs: [],
    status: "active",
    description: "",
    objectives: "",
    startDate: "",
    endDate: "",
    teamIds: [],
    contactIds: [],
    estimatedHours: 0,
  };
}

beforeEach(async () => {
  await db.clients.clear();
  await db.projects.clear();
  useInventoryStore.setState({ clients: [], projects: [] });
});

describe("useInventoryStore", () => {
  it("default: vuoto", () => {
    expect(useInventoryStore.getState().clients).toEqual([]);
    expect(useInventoryStore.getState().projects).toEqual([]);
  });

  it("loadInventory carica clienti (ordinati per nome) e progetti", async () => {
    await db.clients.bulkPut([client("c2", "Beta"), client("c1", "Acme")]);
    await db.projects.bulkPut([
      project("p1", "c1", "Sito"),
      project("p2", "c2", "App"),
    ]);

    await useInventoryStore.getState().loadInventory();

    expect(useInventoryStore.getState().clients.map((c) => c.name)).toEqual([
      "Acme",
      "Beta",
    ]);
    expect(useInventoryStore.getState().projects).toHaveLength(2);
  });

  it("saveProject crea un nuovo progetto (DB + store)", async () => {
    await useInventoryStore.getState().saveProject(project("p1", "c1", "Sito"));

    expect(useInventoryStore.getState().projects).toHaveLength(1);
    expect(useInventoryStore.getState().projects[0].name).toBe("Sito");
    expect(await db.projects.get("p1")).toMatchObject({ name: "Sito" });
  });

  it("saveProject aggiorna un progetto esistente senza duplicarlo", async () => {
    await useInventoryStore.getState().saveProject(project("p1", "c1", "Sito"));
    await useInventoryStore
      .getState()
      .saveProject({ ...project("p1", "c1", "Sito web"), status: "paused" });

    const projects = useInventoryStore.getState().projects;
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Sito web");
    expect(projects[0].status).toBe("paused");
    expect(await db.projects.get("p1")).toMatchObject({ name: "Sito web" });
  });

  it("removeProject elimina il progetto (DB + store)", async () => {
    await useInventoryStore.getState().saveProject(project("p1", "c1", "Sito"));
    await useInventoryStore.getState().saveProject(project("p2", "c1", "App"));

    await useInventoryStore.getState().removeProject("p1");

    expect(useInventoryStore.getState().projects.map((p) => p.id)).toEqual([
      "p2",
    ]);
    expect(await db.projects.get("p1")).toBeUndefined();
  });
});
