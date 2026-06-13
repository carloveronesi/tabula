import { describe, it, expect } from "vitest";
import { occursOn } from "@/domain/recurrence";

const utc = (y: number, m0: number, d: number) => new Date(Date.UTC(y, m0, d));

describe("occursOn", () => {
  it("settimanale il lunedì", () => {
    const rule = "DTSTART:20260601T000000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO";
    expect(occursOn(rule, utc(2026, 5, 1))).toBe(true); // Lun 1 giu
    expect(occursOn(rule, utc(2026, 5, 8))).toBe(true); // Lun 8 giu
    expect(occursOn(rule, utc(2026, 5, 9))).toBe(false); // Mar 9 giu
  });

  it("giornaliero", () => {
    const rule = "DTSTART:20260601T000000Z\nRRULE:FREQ=DAILY";
    expect(occursOn(rule, utc(2026, 5, 2))).toBe(true);
  });

  it("rispetta UNTIL", () => {
    const rule = "DTSTART:20260601T000000Z\nRRULE:FREQ=DAILY;UNTIL=20260603T000000Z";
    expect(occursOn(rule, utc(2026, 5, 3))).toBe(true);
    expect(occursOn(rule, utc(2026, 5, 4))).toBe(false);
  });

  it("non prima della data di inizio", () => {
    const rule = "DTSTART:20260601T000000Z\nRRULE:FREQ=DAILY";
    expect(occursOn(rule, utc(2026, 4, 31))).toBe(false);
  });
});
