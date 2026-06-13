import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/data/settings";

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
    expect(s.slotMinutes).toBe(30);
  });

  it("mappa taskSubtypes su subtypes (solo client/internal)", () => {
    const s = normalizeSettings({
      taskSubtypes: {
        internal: [{ id: "te-ai", label: "TE AI" }],
        client: [{ id: "sal", label: "SAL" }],
        vacation: [{ id: "x", label: "X" }],
      },
    });
    expect(s.subtypes).toEqual({
      client: [{ id: "sal", label: "SAL" }],
      internal: [{ id: "te-ai", label: "TE AI" }],
    });
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
