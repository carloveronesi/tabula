import { describe, it, expect } from "vitest";
import { buildContacts } from "@/data/import/buildContacts";
import { buildInventory } from "@/data/import/buildInventory";
import type { ParsedExport } from "@/data/import/parseExport";

function seqIds(prefix: string) {
  let n = 0;
  return () => `${prefix}${n++}`;
}

const parsed: ParsedExport = {
  months: {},
  settings: null,
  clients: { generali: { name: "Generali" } },
  people: [],
  projects: {
    prj_g: {
      id: "prj_g",
      name: "POC",
      kind: "client",
      clientKey: "generali",
      status: "active",
      clientContacts: ["Enrico", "Sergio"],
    },
    prj_g2: {
      id: "prj_g2",
      name: "POC2",
      kind: "client",
      clientKey: "generali",
      status: "active",
      clientContacts: ["Sergio", "Nicola"], // Sergio duplicato
    },
    prj_i: {
      id: "prj_i",
      name: "Interno",
      kind: "internal",
      clientKey: null,
      clientContacts: ["Ignorato"], // progetto interno → nessun cliente
    },
  },
  todos: [],
};

// clienti(id0) → progetti(id1,id2,id3)
const inv = buildInventory(parsed, seqIds("id"));

describe("buildContacts", () => {
  it("crea contatti per cliente, deduplicati per nome", () => {
    const { contacts, contactIdByKey } = buildContacts(
      parsed,
      inv.clientIdByKey,
      seqIds("c"),
    );

    expect(contacts).toEqual([
      { id: "c0", clientId: "id0", name: "Enrico", role: "" },
      { id: "c1", clientId: "id0", name: "Sergio", role: "" },
      { id: "c2", clientId: "id0", name: "Nicola", role: "" },
    ]);
    expect(Object.keys(contactIdByKey)).toHaveLength(3);
  });

  it("ignora i contatti dei progetti senza cliente", () => {
    const { contacts } = buildContacts(parsed, inv.clientIdByKey, seqIds("c"));
    expect(contacts.some((c) => c.name === "Ignorato")).toBe(false);
  });

  it("nessun progetto → nessun contatto", () => {
    const empty: ParsedExport = { ...parsed, projects: null };
    const { contacts } = buildContacts(empty, inv.clientIdByKey, seqIds("c"));
    expect(contacts).toEqual([]);
  });
});
