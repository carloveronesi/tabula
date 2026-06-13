import { describe, it, expect } from "vitest";
import {
  buildExport,
  exportFilename,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  emptyExportData,
  type ExportData,
} from "@/data/export/buildExport";
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

const client = (id: string): Client => ({
  id,
  name: id,
  color: null,
  createdAt: 0,
});

describe("buildExport", () => {
  it("marca formato e versione di Tabula", () => {
    const out = buildExport(emptyExportData(), 0);
    expect(out.format).toBe(EXPORT_FORMAT);
    expect(out.version).toBe(EXPORT_VERSION);
  });

  it("registra l'istante di export in ISO dal timestamp dato", () => {
    const out = buildExport(emptyExportData(), Date.UTC(2026, 5, 14, 10, 30, 0));
    expect(out.exportedAt).toBe("2026-06-14T10:30:00.000Z");
  });

  it("include tutte le sezioni dati", () => {
    const data: ExportData = {
      ...emptyExportData(),
      entries: [entry("e1"), entry("e2")],
      clients: [client("c1")],
    };
    const out = buildExport(data, 0);
    expect(out.entries.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(out.clients.map((c) => c.id)).toEqual(["c1"]);
    expect(out.projects).toEqual([]);
    expect(out.settings).toBeNull();
  });

  it("su dati vuoti produce sezioni vuote (non undefined)", () => {
    const out = buildExport(emptyExportData(), 0);
    for (const k of [
      "entries",
      "clients",
      "projects",
      "people",
      "contacts",
      "recurrences",
      "todos",
      "days",
    ] as const) {
      expect(Array.isArray(out[k])).toBe(true);
      expect(out[k]).toHaveLength(0);
    }
  });

  it("è serializzabile in JSON e riparsabile identico", () => {
    const data: ExportData = { ...emptyExportData(), entries: [entry("e1")] };
    const out = buildExport(data, 0);
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });
});

describe("exportFilename", () => {
  it("usa la data locale nel nome con prefisso tabula", () => {
    const name = exportFilename(new Date(2026, 5, 14, 23, 59));
    expect(name).toBe("tabula-export-2026-06-14.json");
  });
});
