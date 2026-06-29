import { describe, it, expect } from "vitest";
import { findByName } from "@/domain/dedupeName";

const people = [
  { id: "u1", name: "Mario Rossi" },
  { id: "u2", name: "Anna Bianchi" },
];

describe("findByName", () => {
  it("trova ignorando maiuscole, spazi multipli e accenti", () => {
    expect(findByName(people, "  mario   rossi ")?.id).toBe("u1");
    expect(findByName([{ id: "x", name: "Niccolò" }], "niccolo")?.id).toBe("x");
  });

  it("ritorna undefined se nessuno corrisponde", () => {
    expect(findByName(people, "Marco Rossi")).toBeUndefined();
  });

  it("nome vuoto: nessun match", () => {
    expect(findByName(people, "   ")).toBeUndefined();
  });
});
