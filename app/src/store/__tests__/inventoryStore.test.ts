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
});
