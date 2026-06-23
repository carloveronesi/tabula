import { describe, it, expect } from "vitest";
import { resolveDayLabel } from "@/domain/teams/resolveDay";

// Riferimento: martedì 23 giugno 2026.
const TODAY = new Date(2026, 5, 23);

describe("resolveDayLabel", () => {
  it("oggi / ieri / l'altro ieri", () => {
    expect(resolveDayLabel("Oggi", TODAY)).toBe("2026-06-23");
    expect(resolveDayLabel("Ieri", TODAY)).toBe("2026-06-22");
    expect(resolveDayLabel("L'altro ieri", TODAY)).toBe("2026-06-21");
  });

  it("nome-giorno → occorrenza passata più recente, mai oggi", () => {
    // Oggi è martedì.
    expect(resolveDayLabel("lunedì", TODAY)).toBe("2026-06-22");
    expect(resolveDayLabel("domenica", TODAY)).toBe("2026-06-21");
    expect(resolveDayLabel("venerdì", TODAY)).toBe("2026-06-19");
    expect(resolveDayLabel("sabato", TODAY)).toBe("2026-06-20");
    // Lo stesso giorno della settimana di oggi → una settimana fa, non oggi.
    expect(resolveDayLabel("martedì", TODAY)).toBe("2026-06-16");
  });

  it("è insensibile ad accenti e maiuscole", () => {
    expect(resolveDayLabel("VENERDI", TODAY)).toBe("2026-06-19");
    expect(resolveDayLabel("Mercoledì", TODAY)).toBe("2026-06-17");
  });

  it("date numeriche con e senza anno", () => {
    expect(resolveDayLabel("12/06", TODAY)).toBe("2026-06-12");
    expect(resolveDayLabel("12/06/2025", TODAY)).toBe("2025-06-12");
    expect(resolveDayLabel("12.06.25", TODAY)).toBe("2025-06-12");
  });

  it("ritorna null per etichette non interpretabili o assenti", () => {
    expect(resolveDayLabel(null, TODAY)).toBeNull();
    expect(resolveDayLabel("la settimana scorsa", TODAY)).toBeNull();
    expect(resolveDayLabel("99/99", TODAY)).toBeNull();
  });
});
