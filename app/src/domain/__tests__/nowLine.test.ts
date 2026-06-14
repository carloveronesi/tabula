import { describe, it, expect } from "vitest";
import { nowRowOffset, minutesOfDay } from "@/domain/nowLine";

// Mattina 9–11 + pomeriggio 14–16, slot da 30 min:
// slots = [540, 570, 600, 630, 840, 870, 900, 930]
const SLOTS = [540, 570, 600, 630, 840, 870, 900, 930];
const STEP = 30;

describe("nowRowOffset", () => {
  it("colloca l'ora all'inizio di uno slot", () => {
    expect(nowRowOffset(SLOTS, STEP, 540)).toBe(0); // 09:00 → riga 0
    expect(nowRowOffset(SLOTS, STEP, 600)).toBe(2); // 10:00 → riga 2
  });

  it("interpola dentro lo slot", () => {
    expect(nowRowOffset(SLOTS, STEP, 555)).toBe(0.5); // 09:15 → metà riga 0
    expect(nowRowOffset(SLOTS, STEP, 585)).toBe(1.5); // 09:45
  });

  it("riprende la numerazione dopo un buco (pausa pranzo)", () => {
    expect(nowRowOffset(SLOTS, STEP, 840)).toBe(4); // 14:00 → riga 4
    expect(nowRowOffset(SLOTS, STEP, 855)).toBe(4.5); // 14:15
  });

  it("ritorna null fuori dall'orario o nel buco", () => {
    expect(nowRowOffset(SLOTS, STEP, 480)).toBeNull(); // 08:00 prima
    expect(nowRowOffset(SLOTS, STEP, 720)).toBeNull(); // 12:00 in pausa
    expect(nowRowOffset(SLOTS, STEP, 1020)).toBeNull(); // 17:00 dopo
  });

  it("minutesOfDay calcola i minuti dalla mezzanotte", () => {
    expect(minutesOfDay(new Date(2026, 5, 14, 9, 30))).toBe(570);
    expect(minutesOfDay(new Date(2026, 5, 14, 0, 0))).toBe(0);
  });
});
