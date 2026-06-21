import { describe, expect, it } from "vitest";
import { elapsedLabel, timerSeed } from "@/domain/timer";

// Costruisce un epoch ms in ora locale (i seed usano i getter locali).
const at = (h: number, m: number, s = 0) =>
  new Date(2026, 5, 21, h, m, s).getTime();

describe("elapsedLabel", () => {
  it("mostra m:ss sotto l'ora", () => {
    expect(elapsedLabel(0)).toBe("0:00");
    expect(elapsedLabel(7_000)).toBe("0:07");
    expect(elapsedLabel(83_000)).toBe("1:23");
  });

  it("mostra h:mm:ss da un'ora in su", () => {
    expect(elapsedLabel(3_600_000)).toBe("1:00:00");
    expect(elapsedLabel(3_600_000 + 83_000)).toBe("1:01:23");
  });

  it("tratta i negativi come zero", () => {
    expect(elapsedLabel(-5_000)).toBe("0:00");
  });
});

describe("timerSeed", () => {
  it("arrotonda l'inizio allo slot e ricava la fine dalla durata", () => {
    // 09:07 → 09:00; 85 min ≈ 3 slot da 30 → +90 → 10:30.
    const seed = timerSeed(at(9, 7), at(10, 32), 30);
    expect(seed).toEqual({ date: "2026-06-21", startMin: 540, endMin: 630 });
  });

  it("rispetta lo slot da 15 minuti", () => {
    const seed = timerSeed(at(9, 5), at(9, 50), 15);
    // 09:05 → 09:00 (nearest 15); 45 min = 3 slot → 09:45.
    expect(seed).toEqual({ date: "2026-06-21", startMin: 540, endMin: 585 });
  });

  it("garantisce almeno uno slot di durata per timer brevissimi", () => {
    const seed = timerSeed(at(9, 0), at(9, 0, 20), 30);
    expect(seed.endMin - seed.startMin).toBe(30);
  });

  it("limita la fine a fine giornata se valica la mezzanotte", () => {
    const seed = timerSeed(at(23, 30), at(23, 30) + 2 * 3_600_000, 30);
    expect(seed.endMin).toBe(1440);
    expect(seed.startMin).toBe(1410);
  });
});
