import { describe, it, expect } from "vitest";
import type { Entry } from "@/data/types";
import { rankProjectsByUsage } from "@/domain/projectUsage";

function entry(projectId: string | null): Entry {
  return { projectId } as Entry;
}

describe("rankProjectsByUsage", () => {
  it("mette in cima i progetti più usati, parità → ordine d'ingresso", () => {
    const projects = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const entries = [entry("b"), entry("b"), entry("c"), entry(null)];
    // b:2 usi, c:1, a:0
    expect(rankProjectsByUsage(projects, entries).map((p) => p.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("senza storico conserva l'ordine originale", () => {
    const projects = [{ id: "x" }, { id: "y" }];
    expect(rankProjectsByUsage(projects, []).map((p) => p.id)).toEqual(["x", "y"]);
  });
});
