import { describe, it, expect } from "vitest";
import {
  clampMin,
  snap,
  parseTimeInput,
  stepTime,
  formatTime,
} from "@/domain/timeField";

describe("timeField", () => {
  it("clampMin tiene il valore nell'arco del giorno", () => {
    expect(clampMin(-10)).toBe(0);
    expect(clampMin(99999)).toBe(1439);
    expect(clampMin(540)).toBe(540);
  });

  it("snap arrotonda alla griglia", () => {
    expect(snap(545, 30)).toBe(540);
    expect(snap(555, 30)).toBe(570);
    expect(snap(543, 15)).toBe(540);
    expect(snap(550, 15)).toBe(555);
  });

  it("parseTimeInput accetta formati con separatore", () => {
    expect(parseTimeInput("9:30")).toBe(570);
    expect(parseTimeInput("09.30")).toBe(570);
    expect(parseTimeInput("9h30")).toBe(570);
    expect(parseTimeInput("17:45")).toBe(17 * 60 + 45);
    expect(parseTimeInput("9:3")).toBe(9 * 60 + 3); // minuti a una cifra → 09:03
  });

  it("parseTimeInput accetta cifre compatte", () => {
    expect(parseTimeInput("9")).toBe(540);
    expect(parseTimeInput("09")).toBe(540);
    expect(parseTimeInput("930")).toBe(570);
    expect(parseTimeInput("1745")).toBe(17 * 60 + 45);
  });

  it("parseTimeInput rifiuta valori non validi", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("abc")).toBeNull();
    expect(parseTimeInput("9:70")).toBeNull();
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("12:30:00")).toBeNull();
  });

  it("stepTime sale e scende sulla griglia, con clamp", () => {
    expect(stepTime(540, 1, 30)).toBe(570);
    expect(stepTime(540, -1, 30)).toBe(510);
    expect(stepTime(545, 1, 30)).toBe(570); // allinea poi sale
    expect(stepTime(0, -1, 30)).toBe(0);
    expect(stepTime(1439, 1, 30)).toBe(1439);
  });

  it("formatTime zero-padda ore e minuti", () => {
    expect(formatTime(540)).toBe("09:00");
    expect(formatTime(570)).toBe("09:30");
    expect(formatTime(0)).toBe("00:00");
  });
});
