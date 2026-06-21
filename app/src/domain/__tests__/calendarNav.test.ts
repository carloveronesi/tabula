import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonths,
  dowMon0,
  isoDate,
  isPatronDay,
  monthGridDates,
  workingDatesOfMonth,
  shiftFocus,
  viewRange,
  workWeekDays,
} from "@/domain/calendarNav";

const D = (y: number, m0: number, d: number) => new Date(y, m0, d);

describe("isPatronDay", () => {
  it("confronta mese-giorno indipendentemente dall'anno", () => {
    expect(isPatronDay(D(2026, 5, 24), "06-24")).toBe(true); // 24 giugno
    expect(isPatronDay(D(2027, 5, 24), "06-24")).toBe(true);
    expect(isPatronDay(D(2026, 5, 25), "06-24")).toBe(false);
  });

  it("stringa vuota → mai festivo", () => {
    expect(isPatronDay(D(2026, 5, 24), "")).toBe(false);
  });
});

describe("workingDatesOfMonth", () => {
  it("conta i feriali lun–ven escludendo i weekend", () => {
    // Giugno 2026: 22 giorni feriali lun–ven.
    const dates = workingDatesOfMonth(D(2026, 5, 15), [0, 1, 2, 3, 4], "");
    expect(dates).toHaveLength(22);
    expect(dates[0]).toBe("2026-06-01"); // 1 giugno è lunedì
  });

  it("esclude il giorno del patrono", () => {
    const full = workingDatesOfMonth(D(2026, 5, 15), [0, 1, 2, 3, 4], "");
    const less = workingDatesOfMonth(D(2026, 5, 15), [0, 1, 2, 3, 4], "06-24");
    expect(less).toHaveLength(full.length - 1); // 24 giugno 2026 è mercoledì
    expect(less).not.toContain("2026-06-24");
  });
});

describe("addDays / addMonths", () => {
  it("addDays somma i giorni", () => {
    expect(addDays(D(2026, 5, 15), 1)).toEqual(D(2026, 5, 16));
    expect(addDays(D(2026, 5, 1), -1)).toEqual(D(2026, 4, 31));
  });

  it("addMonths fa clamp all'ultimo giorno valido", () => {
    expect(addMonths(D(2026, 0, 31), 1)).toEqual(D(2026, 1, 28)); // 31 gen → 28 feb
  });
});

describe("dowMon0", () => {
  it("lunedì = 0, domenica = 6", () => {
    expect(dowMon0(D(2026, 5, 1))).toBe(0); // lun 1 giu
    expect(dowMon0(D(2026, 5, 7))).toBe(6); // dom 7 giu
  });
});

describe("shiftFocus", () => {
  it("day → ±1 giorno", () => {
    expect(shiftFocus(D(2026, 5, 15), "day", 1)).toEqual(D(2026, 5, 16));
    expect(shiftFocus(D(2026, 5, 15), "day", -1)).toEqual(D(2026, 5, 14));
  });

  it("week → ±7 giorni", () => {
    expect(shiftFocus(D(2026, 5, 15), "week", 1)).toEqual(D(2026, 5, 22));
  });

  it("month → ±1 mese", () => {
    expect(shiftFocus(D(2026, 5, 15), "month", 1)).toEqual(D(2026, 6, 15));
    expect(shiftFocus(D(2026, 5, 15), "month", -1)).toEqual(D(2026, 4, 15));
  });

  it("projects/todo → nessuno spostamento", () => {
    expect(shiftFocus(D(2026, 5, 15), "projects", 1)).toEqual(D(2026, 5, 15));
  });
});

describe("workWeekDays", () => {
  it("lun–ven della settimana contenente la data", () => {
    const w = workWeekDays(D(2026, 5, 10), [0, 1, 2, 3, 4]); // mer 10 giu
    expect(w).toHaveLength(5);
    expect(w[0]).toEqual(D(2026, 5, 8)); // lun
    expect(w[4]).toEqual(D(2026, 5, 12)); // ven
  });

  it("rispetta un sottoinsieme di giorni lavorativi", () => {
    const w = workWeekDays(D(2026, 5, 10), [0, 2, 4]); // lun/mer/ven
    expect(w).toEqual([D(2026, 5, 8), D(2026, 5, 10), D(2026, 5, 12)]);
  });
});

describe("isoDate", () => {
  it("formatta la data locale come YYYY-MM-DD", () => {
    expect(isoDate(D(2026, 5, 1))).toBe("2026-06-01");
    expect(isoDate(D(2026, 0, 9))).toBe("2026-01-09");
  });
});

describe("viewRange", () => {
  it("day → l'intero giorno [00:00:00, 23:59:59]", () => {
    expect(viewRange(D(2026, 5, 12), "day")).toEqual({
      from: "2026-06-12T00:00:00",
      to: "2026-06-12T23:59:59",
    });
  });

  it("week → lun–dom della settimana contenente la data", () => {
    // mer 10 giu 2026 → lun 8 … dom 14
    expect(viewRange(D(2026, 5, 10), "week")).toEqual({
      from: "2026-06-08T00:00:00",
      to: "2026-06-14T23:59:59",
    });
  });

  it("month → l'intera griglia 6×7 (include i giorni dei mesi adiacenti)", () => {
    // luglio 2026: la griglia parte da lun 29 giu e copre 42 giorni
    expect(viewRange(D(2026, 6, 15), "month")).toEqual({
      from: "2026-06-29T00:00:00",
      to: "2026-08-09T23:59:59",
    });
  });

  it("riepilogo → confini esatti del mese di calendario", () => {
    expect(viewRange(D(2026, 6, 15), "riepilogo")).toEqual({
      from: "2026-07-01T00:00:00",
      to: "2026-07-31T23:59:59",
    });
  });

  it("projects/todo → il giorno corrente (range inerte)", () => {
    expect(viewRange(D(2026, 5, 12), "projects")).toEqual({
      from: "2026-06-12T00:00:00",
      to: "2026-06-12T23:59:59",
    });
  });
});

describe("monthGridDates", () => {
  it("42 date, lun-based; giugno 2026 inizia di lunedì", () => {
    const g = monthGridDates(D(2026, 5, 15));
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual(D(2026, 5, 1)); // lun 1 giu
  });

  it("riempie i giorni del mese precedente quando il 1° non è lunedì", () => {
    const g = monthGridDates(D(2026, 6, 15)); // luglio: 1 lug = mercoledì
    expect(g[0]).toEqual(D(2026, 5, 29)); // lun 29 giu
    expect(g[2]).toEqual(D(2026, 6, 1)); // mer 1 lug
    expect(g).toHaveLength(42);
  });
});
