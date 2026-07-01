import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { useInventoryStore } from "@/store/inventory";
import type { Client, Contact, Entry, Person, Project } from "@/data/types";

function entry(id: string, over: Partial<Entry> = {}): Entry {
  return {
    id,
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

function client(id: string, name: string): Client {
  return { id, name, color: null, createdAt: 0 };
}

function person(id: string, name: string): Person {
  return { id, name };
}

function contact(id: string, clientId: string, name: string): Contact {
  return { id, clientId, name, role: "" };
}

function project(id: string, clientId: string | null, name: string): Project {
  return {
    id,
    clientId,
    kind: clientId ? "client" : "internal",
    name,
    status: "active",
    description: "",
    objectives: "",
    startDate: "",
    endDate: "",
    teamIds: [],
    contactIds: [],
    estimatedHours: 0,
    color: null,
  };
}

beforeEach(async () => {
  await db.clients.clear();
  await db.projects.clear();
  await db.people.clear();
  await db.contacts.clear();
  await db.entries.clear();
  useInventoryStore.setState({ clients: [], projects: [], people: [], contacts: [] });
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

  it("saveClient inserisce mantenendo l'ordine alfabetico (DB + store)", async () => {
    await useInventoryStore.getState().saveClient(client("c1", "Beta"));
    await useInventoryStore.getState().saveClient(client("c2", "Acme"));

    expect(useInventoryStore.getState().clients.map((c) => c.name)).toEqual([
      "Acme",
      "Beta",
    ]);
    expect(await db.clients.get("c2")).toMatchObject({ name: "Acme" });
  });

  it("saveClient aggiorna un cliente esistente senza duplicarlo", async () => {
    await useInventoryStore.getState().saveClient(client("c1", "Beta"));
    await useInventoryStore.getState().saveClient(client("c1", "Beta SRL"));

    const clients = useInventoryStore.getState().clients;
    expect(clients).toHaveLength(1);
    expect(clients[0].name).toBe("Beta SRL");
  });

  it("savePerson inserisce mantenendo l'ordine alfabetico", async () => {
    await useInventoryStore.getState().savePerson(person("u1", "Zoe"));
    await useInventoryStore.getState().savePerson(person("u2", "Ada"));

    expect(useInventoryStore.getState().people.map((p) => p.name)).toEqual([
      "Ada",
      "Zoe",
    ]);
  });

  it("saveContact crea e aggiorna senza duplicare (DB + store)", async () => {
    await useInventoryStore.getState().saveContact(contact("k1", "c1", "Mario"));
    await useInventoryStore
      .getState()
      .saveContact({ ...contact("k1", "c1", "Mario Rossi"), role: "PM" });

    const contacts = useInventoryStore.getState().contacts;
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ name: "Mario Rossi", role: "PM" });
    expect(await db.contacts.get("k1")).toMatchObject({ name: "Mario Rossi" });
  });

  it("mergePerson riassegna i riferimenti (entry + team) ed elimina la sorgente", async () => {
    await db.people.bulkPut([person("u1", "Mario"), person("u2", "M. Rossi")]);
    await db.projects.put({ ...project("p1", "c1", "Sito"), teamIds: ["u1", "u2"] });
    await db.entries.put(entry("e1", { collaboratorIds: ["u1"] }));
    useInventoryStore.setState({ people: [person("u1", "Mario"), person("u2", "M. Rossi")] });

    await useInventoryStore.getState().mergePerson("u1", "u2");

    expect(useInventoryStore.getState().people.map((p) => p.id)).toEqual(["u2"]);
    expect(await db.people.get("u1")).toBeUndefined();
    expect((await db.entries.get("e1"))!.collaboratorIds).toEqual(["u2"]);
    // dedup: il team aveva sia u1 sia u2 → resta solo u2.
    expect((await db.projects.get("p1"))!.teamIds).toEqual(["u2"]);
  });

  it("removePerson toglie la persona da attività e team", async () => {
    await db.people.put(person("u1", "Mario"));
    await db.projects.put({ ...project("p1", "c1", "Sito"), teamIds: ["u1", "u9"] });
    await db.entries.put(entry("e1", { collaboratorIds: ["u1", "u9"] }));
    useInventoryStore.setState({ people: [person("u1", "Mario")] });

    await useInventoryStore.getState().removePerson("u1");

    expect(useInventoryStore.getState().people).toEqual([]);
    expect((await db.entries.get("e1"))!.collaboratorIds).toEqual(["u9"]);
    expect((await db.projects.get("p1"))!.teamIds).toEqual(["u9"]);
  });

  it("removeContact toglie il contatto da attività e progetti", async () => {
    await db.contacts.put(contact("k1", "c1", "Anna"));
    await db.projects.put({ ...project("p1", "c1", "Sito"), contactIds: ["k1"] });
    await db.entries.put(entry("e1", { contactIds: ["k1", "k2"] }));
    useInventoryStore.setState({ contacts: [contact("k1", "c1", "Anna")] });

    await useInventoryStore.getState().removeContact("k1");

    expect(useInventoryStore.getState().contacts).toEqual([]);
    expect((await db.entries.get("e1"))!.contactIds).toEqual(["k2"]);
    expect((await db.projects.get("p1"))!.contactIds).toEqual([]);
  });
});
