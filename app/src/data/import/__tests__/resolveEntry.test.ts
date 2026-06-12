import { describe, it, expect } from "vitest";
import { resolveEntry } from "@/data/import/resolveEntry";
import { buildInventory } from "@/data/import/buildInventory";
import type { ParsedExport } from "@/data/import/parseExport";
import type { SourceEntry } from "@/data/import/sourceTypes";

function seqIds() {
  let n = 0;
  return () => `id${n++}`;
}

function sourceEntry(over: Partial<SourceEntry> = {}): SourceEntry {
  return {
    type: "client",
    subtypeId: null,
    projectId: null,
    title: "T",
    client: "",
    collaborators: [],
    clientContacts: [],
    notes: "",
    wentWrong: "",
    nextSteps: "",
    links: [],
    milestone: null,
    ...over,
  };
}

// Inventario condiviso: clienti(id0) → persone(id1,id2) → progetti(id3,id4)
const parsed: ParsedExport = {
  months: {},
  settings: null,
  clients: { acme: { name: "ACME" } },
  people: [{ name: "Tizio" }, { name: "Caio" }],
  projects: {
    prj_c: { id: "prj_c", name: "Sito", kind: "client", clientKey: "acme", status: "active" },
    prj_i: { id: "prj_i", name: "Interno", kind: "internal", clientKey: null, subtypeId: "varie", status: "active" },
  },
  todos: [],
};
const inv = buildInventory(parsed, seqIds());

describe("resolveEntry", () => {
  it("entry cliente: risolve projectId, clientId dal progetto, collaboratori noti", () => {
    const core = resolveEntry(
      sourceEntry({
        type: "client",
        projectId: "prj_c",
        title: "Call",
        client: "ACME",
        collaborators: ["Tizio", "Sconosciuto"],
        clientContacts: ["X"],
        notes: "n",
        wentWrong: "w",
        nextSteps: "ns",
        links: [{ label: "l", url: "u" }],
        milestone: "m",
      }),
      inv,
    );

    expect(core).toEqual({
      type: "client",
      projectId: "id3",
      clientId: "id0",
      subtypeId: null,
      title: "Call",
      collaboratorIds: ["id1"], // "Sconosciuto" scartato
      contactIds: [], // contatti rinviati
      notes: "n",
      blockers: "w", // wentWrong → blockers
      nextSteps: "ns",
      links: [{ label: "l", url: "u" }],
      milestone: "m",
    });
  });

  it("entry interna: clientId null, subtypeId mantenuto", () => {
    const core = resolveEntry(
      sourceEntry({ type: "internal", projectId: "prj_i", subtypeId: "varie", title: "X" }),
      inv,
    );
    expect(core).toMatchObject({
      type: "internal",
      projectId: "id4",
      clientId: null,
      subtypeId: "varie",
    });
  });

  it("projectId assente o sconosciuto → projectId e clientId null", () => {
    expect(resolveEntry(sourceEntry({ projectId: null }), inv)).toMatchObject({
      projectId: null,
      clientId: null,
    });
    expect(
      resolveEntry(sourceEntry({ projectId: "prj_inesistente" }), inv),
    ).toMatchObject({ projectId: null, clientId: null });
  });
});
