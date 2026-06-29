import { describe, it, expect } from "vitest";
import { remapIds } from "@/domain/refs";

describe("remapIds", () => {
  it("rimuove l'id (delete) preservando il resto", () => {
    expect(remapIds(["a", "b", "c"], "b", null)).toEqual(["a", "c"]);
  });

  it("sostituisce l'id (merge) mantenendo la posizione", () => {
    expect(remapIds(["a", "b", "c"], "b", "x")).toEqual(["a", "x", "c"]);
  });

  it("deduplica quando il merge collide con un id già presente", () => {
    expect(remapIds(["a", "b", "c"], "a", "c")).toEqual(["c", "b"]);
  });

  it("se l'id non è presente ritorna lo stesso array per riferimento", () => {
    const input = ["a", "b"];
    expect(remapIds(input, "z", null)).toBe(input);
  });
});
