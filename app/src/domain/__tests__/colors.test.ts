import { describe, it, expect } from "vitest";
import {
  PALETTE,
  colorFromKey,
  entryColor,
  projectColor,
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

describe("projectColor", () => {
  it("usa il colore assegnato, o il fallback deterministico se assente", () => {
    expect(projectColor({ id: "p1", color: "#123456" })).toBe("#123456");
    expect(projectColor({ id: "p1", color: null })).toBe(colorFromKey("p1"));
    expect(projectColor({ id: "p1" })).toBe(colorFromKey("p1"));
  });
});

describe("entryColor", () => {
  const projectColors = { p1: "#ff0000" };

  it("usa il colore assegnato al progetto della entry", () => {
    expect(entryColor({ projectId: "p1" }, projectColors)).toBe("#ff0000");
  });

  it("ricade su un colore deterministico se il progetto non ha colore", () => {
    expect(entryColor({ projectId: "p2" }, projectColors)).toBe(colorFromKey("p2"));
  });

  it("ritorna null per una entry senza progetto (ferie/evento/non assegnata)", () => {
    expect(entryColor({ projectId: null }, projectColors)).toBeNull();
  });
});
