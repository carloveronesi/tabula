import { describe, it, expect } from "vitest";
import { importFromNative, isNativeExport } from "@/data/import/fromNativeExport";
import { buildExport, emptyExportData } from "@/data/export/buildExport";
import { DEFAULT_SETTINGS } from "@/data/settings";
import type { Entry } from "@/data/types";

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

describe("isNativeExport", () => {
  it("riconosce un documento con format tabula", () => {
    expect(isNativeExport({ format: "tabula", version: 1 })).toBe(true);
  });
  it("rifiuta il formato legacy e i non-oggetti", () => {
    expect(isNativeExport({ "dailylog:v1:__clients": {} })).toBe(false);
    expect(isNativeExport(null)).toBe(false);
    expect(isNativeExport([])).toBe(false);
  });
});

describe("importFromNative", () => {
  it("passa attraverso le sezioni dati senza trasformarle", () => {
    const doc = buildExport(
      { ...emptyExportData(), entries: [entry("a"), entry("b")] },
      0,
    );
    const result = importFromNative(doc as unknown as Record<string, unknown>);
    expect(result.entries).toEqual([entry("a"), entry("b")]);
    expect(result.clients).toEqual([]);
  });

  it("settings null → DEFAULT_SETTINGS (persistibili)", () => {
    const doc = buildExport(emptyExportData(), 0);
    const result = importFromNative(doc as unknown as Record<string, unknown>);
    expect(result.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("sezioni mancanti diventano array vuoti, non undefined", () => {
    const result = importFromNative({ format: "tabula", version: 1 });
    expect(result.entries).toEqual([]);
    expect(result.todos).toEqual([]);
    expect(result.recurrences).toEqual([]);
  });

  it("versione non supportata → errore leggibile", () => {
    expect(() => importFromNative({ format: "tabula", version: 99 })).toThrow(
      /versione/i,
    );
  });
});
