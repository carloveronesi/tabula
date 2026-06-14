import { describe, it, expect } from "vitest";
import { firstFreeRange, duplicateEntry } from "@/domain/duplicate";
import type { Entry } from "@/data/types";

function entry(id: string, date: string, startMin: number, endMin: number): Entry {
  const hh = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return {
    id,
    startsAt: `${date}T${hh(startMin)}:00`,
    endsAt: `${date}T${hh(endMin)}:00`,
    type: "client",
    projectId: "p1",
    clientId: "c1",
    subtypeId: null,
    title: id,
    collaboratorIds: [],
    contactIds: [],
    notes: "nota",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

const bounds = { startMin: 540, endMin: 1080 }; // 09:00–18:00

describe("firstFreeRange", () => {
  it("trova il primo slot libero saltando le entry esistenti", () => {
    // occupato 09:00–10:00; durata 60 → primo libero 10:00–11:00
    const r = firstFreeRange(
      [entry("a", "2026-06-15", 540, 600)],
      "2026-06-15",
      60,
      bounds,
      30,
    );
    expect(r).toEqual({ startMin: 600, endMin: 660 });
  });

  it("ignora le entry di altri giorni", () => {
    const r = firstFreeRange(
      [entry("a", "2026-06-16", 540, 600)],
      "2026-06-15",
      60,
      bounds,
      30,
    );
    expect(r).toEqual({ startMin: 540, endMin: 600 });
  });

  it("null se non c'è spazio sufficiente", () => {
    // tutta la giornata occupata
    const full = entry("a", "2026-06-15", 540, 1080);
    expect(firstFreeRange([full], "2026-06-15", 60, bounds, 30)).toBeNull();
  });
});

describe("duplicateEntry", () => {
  it("copia contenuto e classificazione con nuovo id, tempi e timestamp", () => {
    const src = entry("a", "2026-06-15", 540, 600);
    const dup = duplicateEntry(src, "2026-06-15", 600, 660, "b", 999);
    expect(dup).toMatchObject({
      id: "b",
      startsAt: "2026-06-15T10:00:00",
      endsAt: "2026-06-15T11:00:00",
      title: "a",
      projectId: "p1",
      clientId: "c1",
      notes: "nota",
      createdAt: 999,
      updatedAt: 999,
    });
  });
});
