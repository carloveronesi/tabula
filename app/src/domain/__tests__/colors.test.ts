import { describe, it, expect } from "vitest";
import {
  PALETTE,
  colorFromKey,
  entryGroupColor,
  projectColor,
  textColorOn,
  tint,
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

describe("tint", () => {
  it("mescola sulla superficie del tema, in oklab", () => {
    expect(tint("#6366f1", 0.16)).toBe(
      "color-mix(in oklab, #6366f1 16%, var(--surface))",
    );
  });
});

describe("projectColor", () => {
  it("usa il colore assegnato, o il fallback deterministico se assente", () => {
    expect(projectColor({ id: "p1", color: "#123456" })).toBe("#123456");
    expect(projectColor({ id: "p1", color: null })).toBe(colorFromKey("p1"));
    expect(projectColor({ id: "p1" })).toBe(colorFromKey("p1"));
  });
});

describe("entryGroupColor", () => {
  const maps = {
    clientColors: { acme: "#ff0000" },
    internalColors: { form: "#00ff00" },
  };

  it("cliente: colore assegnato al cliente, o fallback deterministico", () => {
    expect(
      entryGroupColor({ type: "client", clientId: "acme", subtypeId: null }, maps),
    ).toBe("#ff0000");
    expect(
      entryGroupColor({ type: "client", clientId: "x", subtypeId: null }, maps),
    ).toBe(colorFromKey("x"));
  });

  it("interno: colore per sottotipo, o fallback deterministico", () => {
    expect(
      entryGroupColor({ type: "internal", clientId: null, subtypeId: "form" }, maps),
    ).toBe("#00ff00");
    expect(
      entryGroupColor({ type: "internal", clientId: null, subtypeId: "y" }, maps),
    ).toBe(colorFromKey("y"));
  });

  it("senza cliente/sottotipo ricade sulla tinta del tipo (stabile)", () => {
    const client = entryGroupColor({ type: "client", clientId: null, subtypeId: null }, maps);
    const internal = entryGroupColor({ type: "internal", clientId: null, subtypeId: null }, maps);
    expect(client).not.toBe(internal);
    expect(client).toMatch(/^#[0-9a-f]{6}$/);
  });
});
