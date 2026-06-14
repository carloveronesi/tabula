import { describe, it, expect } from "vitest";
import {
  PALETTE,
  colorFromKey,
  entryColor,
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

describe("entryColor", () => {
  const maps = {
    clientColors: { acme: "#ff0000" },
    internalColors: { dev: "#00ff00" },
  };

  it("usa il colore cliente assegnato", () => {
    expect(
      entryColor({ type: "client", clientId: "acme", subtypeId: null }, maps),
    ).toBe("#ff0000");
  });

  it("ricade su un colore deterministico se il cliente non ha colore", () => {
    const c = entryColor(
      { type: "client", clientId: "globex", subtypeId: null },
      maps,
    );
    expect(c).toBe(colorFromKey("globex"));
  });

  it("usa il colore del sottotipo per le attività interne", () => {
    expect(
      entryColor({ type: "internal", clientId: null, subtypeId: "dev" }, maps),
    ).toBe("#00ff00");
  });

  it("ritorna null per ferie/evento o senza riferimento", () => {
    expect(
      entryColor({ type: "vacation", clientId: null, subtypeId: null }, maps),
    ).toBeNull();
    expect(
      entryColor({ type: "client", clientId: null, subtypeId: null }, maps),
    ).toBeNull();
  });
});
