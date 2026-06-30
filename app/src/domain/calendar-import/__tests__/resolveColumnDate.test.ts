import { describe, it, expect } from "vitest";
import { resolveColumnDate } from "../resolveColumnDate";

// Ancora: martedì 30 giugno 2026; la settimana va da lun 29/6 a ven 3/7.
const ANCHOR = "2026-06-30";

describe("resolveColumnDate", () => {
  it("risolve il numero del giorno nella settimana corrente", () => {
    expect(resolveColumnDate("29 Lun", ANCHOR)).toBe("2026-06-29");
    expect(resolveColumnDate("30 mar", ANCHOR)).toBe("2026-06-30");
  });

  it("supera il confine di mese", () => {
    expect(resolveColumnDate("01 mer", ANCHOR)).toBe("2026-07-01");
    expect(resolveColumnDate("03 ven", ANCHOR)).toBe("2026-07-03");
  });

  it("senza numero ripiega sull'abbreviazione del giorno", () => {
    expect(resolveColumnDate("Lun", ANCHOR)).toBe("2026-06-29");
    expect(resolveColumnDate("Ven", ANCHOR)).toBe("2026-07-03");
  });

  it("etichetta non interpretabile → resta l'ancora", () => {
    expect(resolveColumnDate("Giorno", ANCHOR)).toBe(ANCHOR);
  });
});
