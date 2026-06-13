import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { collectExport } from "@/data/export/collectExport";
import { DEFAULT_SETTINGS } from "@/data/settings";
import type { Client, Entry } from "@/data/types";

const entry = (id: string): Entry => ({
  id,
  startsAt: "2026-06-12T09:00:00",
  endsAt: "2026-06-12T10:00:00",
  type: "client",
  projectId: null,
  clientId: null,
  subtypeId: null,
  title: id,
  collaboratorIds: [],
  contactIds: [],
  notes: "",
  blockers: "",
  nextSteps: "",
  links: [],
  milestone: null,
  createdAt: 0,
  updatedAt: 0,
});

const client = (id: string): Client => ({ id, name: id, color: null, createdAt: 0 });

beforeEach(async () => {
  await Promise.all([
    db.entries.clear(),
    db.clients.clear(),
    db.settings.clear(),
  ]);
});

describe("collectExport", () => {
  it("legge entry e clienti da IndexedDB", async () => {
    await db.entries.bulkPut([entry("a"), entry("b")]);
    await db.clients.bulkPut([client("c1")]);

    const out = await collectExport(0);

    expect(out.entries.map((e) => e.id).sort()).toEqual(["a", "b"]);
    expect(out.clients.map((c) => c.id)).toEqual(["c1"]);
    expect(out.format).toBe("tabula");
  });

  it("esporta le settings come oggetto singolo (non array)", async () => {
    await db.settings.put(DEFAULT_SETTINGS);
    const out = await collectExport(0);
    expect(out.settings?.id).toBe("app");
  });

  it("senza settings salvate, il campo è null", async () => {
    const out = await collectExport(0);
    expect(out.settings).toBeNull();
  });
});
