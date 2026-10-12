import { describe, it, expect } from "vitest";
import { monthPresence } from "@/domain/presence";

// Lun 5 – ven 9 ottobre 2026; "oggi" è mercoledì 7.
const WEEK = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"];
const TODAY = "2026-10-07";
const none = new Set<string>();

describe("monthPresence", () => {
  it("ufficio e cliente valgono entrambi come presenza", () => {
    const p = monthPresence(
      WEEK,
      none,
      { "2026-10-05": "office", "2026-10-06": "client" },
      40,
      "remote",
      TODAY,
    );
    expect(p.required).toBe(2); // 40% di 5
    expect(p.present).toBe(2);
    expect(p.missing).toBe(0);
  });

  it("le ferie intere escono dalla base; i richiesti si arrotondano per eccesso", () => {
    const p = monthPresence(WEEK, new Set(["2026-10-09"]), {}, 40, "remote", TODAY);
    expect(p.workingDays).toBe(5);
    expect(p.vacationDays).toBe(1);
    expect(p.baseDays).toBe(4);
    expect(p.required).toBe(2); // 1,6 → 2
  });

  it("trascorsi senza sede = predefinita; futuri senza sede = da decidere", () => {
    const p = monthPresence(WEEK, none, { "2026-10-08": "office" }, 60, "remote", TODAY);
    expect(p.days.remote).toBe(3); // 5, 6, 7 (oggi compreso)
    expect(p.days.office).toBe(1);
    expect(p.planned).toBe(1); // l'8 è futuro ma già fissato
    expect(p.open).toBe(1); // il 9
    expect(p.required).toBe(3);
    expect(p.missing).toBe(2);
  });

  it("obiettivo a 0: niente richiesti, niente mancanti", () => {
    const p = monthPresence(WEEK, none, {}, 0, "office", TODAY);
    expect(p.required).toBe(0);
    expect(p.missing).toBe(0);
    expect(p.present).toBe(3);
  });
});
