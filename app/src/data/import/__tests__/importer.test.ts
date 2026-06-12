import { describe, it, expect } from "vitest";
import { importFromExport } from "@/data/import/importer";
import type { SourceEntry } from "@/data/import/sourceTypes";

function seqIds() {
  let n = 0;
  return () => `id${n++}`;
}

function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]),
  );
}

function entry(over: Partial<SourceEntry>): SourceEntry {
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

const vacation = entry({ type: "vacation", title: "Ferie" });
const cli = entry({ type: "client", projectId: "prj_a", title: "Call", client: "ACME" });

const raw = stringifyValues({
  "dailylog:v1:2026-06": {
    byDate: {
      "2026-06-01": { AM: vacation, PM: { ...vacation }, location: "remote" },
      "2026-06-02": {
        AM: null,
        PM: null,
        location: "office",
        hours: { "09:00": cli, "09:30": { ...cli } },
      },
    },
  },
  "dailylog:v1:__clients": { acme: { name: "ACME" } },
  "dailylog:v1:__projects": {
    prj_a: { id: "prj_a", name: "P", kind: "client", clientKey: "acme", status: "active" },
  },
  "dailylog:v1:__people": [{ name: "Tizio" }],
  "dailylog:v1:__settings": {
    workHours: { morningStart: 540, morningEnd: 780, afternoonStart: 840, afternoonEnd: 1080 },
    slotMinutes: 30,
  },
});

describe("importFromExport", () => {
  it("compone entità + entry a range dall'export", () => {
    const r = importFromExport(raw, { makeId: seqIds(), now: 1000 });

    // inventario: clienti(id0) → persone(id1) → progetti(id2) → entry(id3,id4)
    expect(r.clients).toHaveLength(1);
    expect(r.projects).toHaveLength(1);
    expect(r.people).toHaveLength(1);

    expect(r.days).toEqual([
      { date: "2026-06-01", location: "remote" },
      { date: "2026-06-02", location: "office" },
    ]);

    expect(r.entries).toHaveLength(2);

    expect(r.entries[0]).toMatchObject({
      id: "id3",
      startsAt: "2026-06-01T09:00:00",
      endsAt: "2026-06-01T18:00:00",
      type: "vacation",
      projectId: null,
      createdAt: 1000,
      updatedAt: 1000,
    });

    expect(r.entries[1]).toMatchObject({
      id: "id4",
      startsAt: "2026-06-02T09:00:00",
      endsAt: "2026-06-02T10:00:00",
      type: "client",
      projectId: "id2",
      clientId: "id0",
    });
  });

  it("contatti/ricorrenze/todo ancora rinviati (vuoti)", () => {
    const r = importFromExport(raw, { makeId: seqIds() });
    expect(r.contacts).toEqual([]);
    expect(r.recurrences).toEqual([]);
    expect(r.todos).toEqual([]);
  });
});
