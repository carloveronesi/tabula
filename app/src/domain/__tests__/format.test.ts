import { describe, it, expect } from "vitest";
import { formatPeriod } from "@/domain/format";

const D = (y: number, m0: number, d: number) => new Date(y, m0, d);

describe("formatPeriod", () => {
  it("day → giorno per esteso, iniziale maiuscola", () => {
    expect(formatPeriod(D(2026, 5, 13), "day")).toBe("Sabato 13 giugno 2026");
  });

  it("month → mese e anno", () => {
    expect(formatPeriod(D(2026, 5, 13), "month")).toBe("Giugno 2026");
  });

  it("week → intervallo lun–dom nello stesso mese", () => {
    // mer 10 giu 2026 → lun 8 … dom 14
    expect(formatPeriod(D(2026, 5, 10), "week")).toBe("8–14 giugno 2026");
  });

  it("week → intervallo a cavallo di due mesi", () => {
    // mer 1 lug 2026 → lun 29 giu … dom 5 lug
    expect(formatPeriod(D(2026, 6, 1), "week")).toBe("29 giu – 5 lug 2026");
  });

  it("projects/todo → stringa vuota (nessun periodo)", () => {
    expect(formatPeriod(D(2026, 5, 13), "projects")).toBe("");
    expect(formatPeriod(D(2026, 5, 13), "todo")).toBe("");
  });
});
