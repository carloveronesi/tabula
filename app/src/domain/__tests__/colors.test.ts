import { describe, it, expect } from "vitest";
import {
  PALETTE,
  colorFromKey,
  textColorOn,
  withAlpha,
} from "@/domain/colors";

describe("colorFromKey", () => {
  it("è deterministico e ritorna un colore della palette", () => {
    const a = colorFromKey("acme");
    expect(colorFromKey("acme")).toBe(a);
    expect(PALETTE).toContain(a);
  });

  it("chiavi diverse possono dare colori diversi", () => {
    const keys = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const distinct = new Set(keys.map((k) => colorFromKey(k)));
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe("textColorOn", () => {
  it("sfondo chiaro → testo nero, sfondo scuro → testo bianco", () => {
    expect(textColorOn("#ffffff")).toBe("#000000");
    expect(textColorOn("#000000")).toBe("#ffffff");
    expect(textColorOn("#6366f1")).toBe("#ffffff"); // indigo scuro
  });

  it("supporta hex a 3 cifre", () => {
    expect(textColorOn("#fff")).toBe("#000000");
  });
});

describe("withAlpha", () => {
  it("converte hex in rgba", () => {
    expect(withAlpha("#6366f1", 0.5)).toBe("rgba(99, 102, 241, 0.5)");
  });
});
