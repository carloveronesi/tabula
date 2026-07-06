import { describe, it, expect } from "vitest";
import { availableMinutes, dailyWorkMinutes } from "@/domain/capacity";
import type { Entry, ISODate, ISODateTime } from "@/data/types";

const WH = { morningStart: 540, morningEnd: 780, afternoonStart: 840, afternoonEnd: 1080 };
const FULL = 480; // 8h

function vacation(date: ISODate, startsAt: ISODateTime, endsAt: ISODateTime): Entry {
  return {
    id: date,
    startsAt,
    endsAt,
    type: "vacation",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: "ferie",
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("availableMinutes", () => {
  it("giornata piena per ogni feriale, niente ferie", () => {
    expect(dailyWorkMinutes(WH)).toBe(FULL);
    expect(availableMinutes(["2026-03-10", "2026-03-11"], [], WH)).toBe(2 * FULL);
  });

  it("le ferie scalano la capacità: intera azzera, mezza dimezza", () => {
    const entries = [
      vacation("2026-03-10", "2026-03-10T09:00:00", "2026-03-10T18:00:00"), // intera → 480
      vacation("2026-03-11", "2026-03-11T09:00:00", "2026-03-11T13:00:00"), // mattina → 240
    ];
    // 2×480 disponibili − 480 − 240 = 240.
    expect(availableMinutes(["2026-03-10", "2026-03-11"], entries, WH)).toBe(240);
  });

  it("ferie fuori dai giorni passati non contano; mai negativo", () => {
    const entries = [vacation("2026-03-09", "2026-03-09T09:00:00", "2026-03-09T18:00:00")];
    expect(availableMinutes(["2026-03-10"], entries, WH)).toBe(FULL);
    expect(availableMinutes([], entries, WH)).toBe(0);
  });
});
