import { describe, it, expect } from "vitest";
import { easterSunday, nationalHolidayName } from "@/domain/holidays";

const D = (y: number, m0: number, d: number) => new Date(y, m0, d);

describe("easterSunday", () => {
  it("calcola la domenica di Pasqua (Computus gregoriano)", () => {
    expect(easterSunday(2026)).toEqual(D(2026, 3, 5)); // 5 aprile 2026
    expect(easterSunday(2024)).toEqual(D(2024, 2, 31)); // 31 marzo 2024
    expect(easterSunday(2027)).toEqual(D(2027, 2, 28)); // 28 marzo 2027
  });
});

describe("nationalHolidayName", () => {
  it("riconosce le festività a data fissa", () => {
    expect(nationalHolidayName(D(2026, 5, 2))).toBe("Festa della Repubblica");
    expect(nationalHolidayName(D(2026, 0, 1))).toBe("Capodanno");
    expect(nationalHolidayName(D(2026, 11, 25))).toBe("Natale");
    expect(nationalHolidayName(D(2026, 7, 15))).toBe("Ferragosto");
  });

  it("riconosce la Pasquetta (Lunedì dell'Angelo)", () => {
    expect(nationalHolidayName(D(2026, 3, 6))).toBe("Lunedì dell'Angelo"); // 6 apr 2026
    expect(nationalHolidayName(D(2024, 3, 1))).toBe("Lunedì dell'Angelo"); // 1 apr 2024
  });

  it("la domenica di Pasqua resta non etichettata (è già weekend)", () => {
    expect(nationalHolidayName(D(2026, 3, 5))).toBeNull();
  });

  it("un giorno feriale qualunque è null", () => {
    expect(nationalHolidayName(D(2026, 5, 3))).toBeNull();
  });
});
