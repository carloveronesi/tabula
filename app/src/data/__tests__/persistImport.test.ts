import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { persistImport } from "@/data/persistImport";
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

const cli = entry({ type: "client", projectId: "prj_a", title: "Call", client: "ACME" });

const raw = stringifyValues({
  "dailylog:v1:2026-06": {
    byDate: {
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
});

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("persistImport", () => {
  it("scrive entità ed entry su IndexedDB", async () => {
    const r = importFromExport(raw, { makeId: seqIds(), now: 1 });
    await persistImport(r);

    expect(await db.entries.count()).toBe(r.entries.length);
    expect(await db.clients.count()).toBe(r.clients.length);
    expect(await db.projects.count()).toBe(r.projects.length);
    expect(await db.people.count()).toBe(r.people.length);
    expect(await db.days.count()).toBe(r.days.length);
    expect(await db.settings.get("app")).toMatchObject({ id: "app" });
  });

  it("round-trip: rilegge una entry per id", async () => {
    const r = importFromExport(raw, { makeId: seqIds(), now: 1 });
    await persistImport(r);

    const first = r.entries[0];
    expect(await db.entries.get(first.id)).toEqual(first);
  });

  it("idempotente per id: re-import non duplica", async () => {
    const r = importFromExport(raw, { makeId: seqIds(), now: 1 });
    await persistImport(r);
    await persistImport(r);

    expect(await db.entries.count()).toBe(r.entries.length);
    expect(await db.clients.count()).toBe(r.clients.length);
  });
});
