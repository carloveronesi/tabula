import { describe, it, expect } from "vitest";
import { buildInventory } from "@/data/import/buildInventory";
import type { ParsedExport } from "@/data/import/parseExport";

/** Factory di id deterministica per i test: id0, id1, … */
function seqIds() {
  let n = 0;
  return () => `id${n++}`;
}

function parsed(over: Partial<ParsedExport> = {}): ParsedExport {
  return {
    months: {},
    settings: null,
    projects: null,
    clients: null,
    people: [],
    todos: [],
    ...over,
  };
}

describe("buildInventory", () => {
  it("input vuoto → entità ed indici vuoti", () => {
    const inv = buildInventory(parsed(), seqIds());
    expect(inv).toEqual({
      clients: [],
      projects: [],
      people: [],
      clientIdByKey: {},
      projectIdBySourceId: {},
      personIdByName: {},
    });
  });

  it("crea clienti con id opachi e indice per clientKey", () => {
    const inv = buildInventory(
      parsed({ clients: { acme: { name: "ACME" }, globex: { name: "Globex" } } }),
      seqIds(),
    );
    expect(inv.clients).toEqual([
      { id: "id0", name: "ACME", color: null, createdAt: expect.any(Number) },
      { id: "id1", name: "Globex", color: null, createdAt: expect.any(Number) },
    ]);
    expect(inv.clientIdByKey).toEqual({ acme: "id0", globex: "id1" });
  });

  it("crea persone con indice per nome", () => {
    const inv = buildInventory(
      parsed({ people: [{ name: "Tizio" }, { name: "Caio" }] }),
      seqIds(),
    );
    expect(inv.people).toEqual([
      { id: "id0", name: "Tizio" },
      { id: "id1", name: "Caio" },
    ]);
    expect(inv.personIdByName).toEqual({ Tizio: "id0", Caio: "id1" });
  });

  it("crea progetti collegando clientId e teamIds risolti", () => {
    const inv = buildInventory(
      parsed({
        clients: { acme: { name: "ACME" } },
        people: [{ name: "Tizio" }],
        projects: {
          prj_1: {
            id: "prj_1",
            name: "Sito",
            kind: "client",
            clientKey: "acme",
            status: "active",
            team: ["Tizio"],
            description: "d",
            objectives: "o",
            startDate: "2026-01-01",
            endDate: "",
          },
          prj_2: {
            id: "prj_2",
            name: "Interno X",
            kind: "internal",
            clientKey: null,
            subtypeId: "varie",
            status: "archived",
          },
        },
      }),
      seqIds(),
    );

    // ordine di creazione: clienti(id0) → persone(id1) → progetti(id2,id3)
    expect(inv.projectIdBySourceId).toEqual({ prj_1: "id2", prj_2: "id3" });
    expect(inv.projects[0]).toMatchObject({
      id: "id2",
      clientId: "id0",
      kind: "client",
      name: "Sito",
      status: "active",
      teamIds: ["id1"],
      startDate: "2026-01-01",
      contactIds: [],
    });
    expect(inv.projects[1]).toMatchObject({
      id: "id3",
      clientId: null,
      kind: "internal",
      name: "Interno X",
      status: "archived",
      teamIds: [],
    });
  });

  it("clientKey sconosciuto → clientId null; status non valido → active", () => {
    const inv = buildInventory(
      parsed({
        projects: {
          prj_x: {
            id: "prj_x",
            name: "Orfano",
            kind: "client",
            clientKey: "inesistente",
            status: "boh",
          },
        },
      }),
      seqIds(),
    );
    expect(inv.projects[0]).toMatchObject({ clientId: null, status: "active" });
  });

  it("team con nomi non in anagrafica → scartati dai teamIds", () => {
    const inv = buildInventory(
      parsed({
        people: [{ name: "Tizio" }],
        projects: {
          prj_1: {
            id: "prj_1",
            name: "P",
            kind: "internal",
            clientKey: null,
            team: ["Tizio", "Sconosciuto"],
          },
        },
      }),
      seqIds(),
    );
    expect(inv.projects[0].teamIds).toEqual(["id0"]);
  });
});
