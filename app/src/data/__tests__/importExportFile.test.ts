import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { importExportFile } from "@/data/importExportFile";

function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]),
  );
}

const cli = {
  type: "client",
  subtypeId: null,
  projectId: "prj_a",
  title: "Call",
  client: "ACME",
  collaborators: [],
  clientContacts: [],
  notes: "",
  wentWrong: "",
  nextSteps: "",
  links: [],
  milestone: null,
};

const exportObject = stringifyValues({
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

describe("importExportFile", () => {
  it("importa un export valido e restituisce il riepilogo", async () => {
    const summary = await importExportFile(JSON.stringify(exportObject));

    expect(summary.clients).toBe(1);
    expect(summary.projects).toBe(1);
    expect(summary.entries).toBeGreaterThan(0);
    expect(await db.clients.count()).toBe(1);
    expect(await db.entries.count()).toBe(summary.entries);
    expect(await db.settings.get("app")).toMatchObject({ id: "app" });
  });

  it("rifiuta JSON non leggibile", async () => {
    await expect(importExportFile("{ non valido")).rejects.toThrow(/JSON/i);
  });

  it("rifiuta un JSON che non è un oggetto", async () => {
    await expect(importExportFile("[1,2,3]")).rejects.toThrow(/formato/i);
  });
});
