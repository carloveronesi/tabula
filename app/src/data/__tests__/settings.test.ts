import { describe, it, expect } from "vitest";
import type { Settings } from "@/data/types";
import { DEFAULT_SETTINGS, migrateSettings, normalizeSettings } from "@/data/settings";

describe("normalizeSettings", () => {
  it("source null → default", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("riporta i campi validi", () => {
    const s = normalizeSettings({
      theme: "dark",
      defaultView: "week",
      defaultLocation: "office",
      workHours: { morningStart: 480, morningEnd: 720, afternoonStart: 800, afternoonEnd: 1040 },
      workingDays: [0, 1, 2, 3, 4, 5],
      slotMinutes: 15,
    });
    expect(s).toMatchObject({
      id: "app",
      theme: "dark",
      defaultView: "week",
      defaultLocation: "office",
      workHours: { morningStart: 480, morningEnd: 720, afternoonStart: 800, afternoonEnd: 1040 },
      workingDays: [0, 1, 2, 3, 4, 5],
      slotMinutes: 15,
    });
  });

  it("valori non validi → default (theme, slotMinutes)", () => {
    const s = normalizeSettings({ theme: "boh", slotMinutes: 7 });
    expect(s.theme).toBe("light");
    expect(s.slotMinutes).toBe(15); // default
  });

  it("preserva una granularità valida di 30 minuti", () => {
    expect(normalizeSettings({ slotMinutes: 30 }).slotMinutes).toBe(30);
  });

  it("fonde taskSubtypes client+internal in un'unica lista", () => {
    const s = normalizeSettings({
      taskSubtypes: {
        internal: [{ id: "te-ai", label: "TE AI" }],
        client: [{ id: "sal", label: "SAL" }],
        vacation: [{ id: "x", label: "X" }],
      },
    });
    expect(s.subtypes).toEqual([
      { id: "sal", label: "SAL" },
      { id: "te-ai", label: "TE AI" },
    ]);
  });

  it("internalColors passa (subtypeId stabili); clientColors azzerati", () => {
    const s = normalizeSettings({
      internalColors: { "te-ai": "#ffffff" },
      clientColors: { generali: "#000000" },
    });
    expect(s.internalColors).toEqual({ "te-ai": "#ffffff" });
    expect(s.clientColors).toEqual({});
  });

  it("presenceTracking normalizzato", () => {
    const s = normalizeSettings({
      presenceTracking: { enabled: true, officeTargetPct: 40, clientTargetPct: 0 },
    });
    expect(s.presenceTracking).toEqual({
      enabled: true,
      officeTargetPct: 40,
      clientTargetPct: 0,
    });
  });
});

describe("migrateSettings", () => {
  it("null → default", () => {
    expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("fonde la vecchia forma {client,internal} in un'unica lista (dedup per id)", () => {
    const stored = {
      ...DEFAULT_SETTINGS,
      subtypes: {
        client: [{ id: "sal", label: "SAL" }],
        internal: [{ id: "sal", label: "SAL" }, { id: "kt", label: "KT" }],
      },
    } as unknown as Settings;
    expect(migrateSettings(stored).subtypes).toEqual([
      { id: "sal", label: "SAL" },
      { id: "kt", label: "KT" },
    ]);
  });

  it("lascia intatta la lista già piatta", () => {
    const stored = { ...DEFAULT_SETTINGS, subtypes: [{ id: "kt", label: "KT" }] };
    expect(migrateSettings(stored).subtypes).toEqual([{ id: "kt", label: "KT" }]);
  });
});
