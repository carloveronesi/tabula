import { describe, it, expect } from "vitest";
import type { Entry, ISODateTime } from "@/data/types";
import { findConflicts, type ImportInterval } from "../importConflicts";

function entry(startsAt: ISODateTime, endsAt: ISODateTime): Entry {
  return {
    id: startsAt,
    startsAt,
    endsAt,
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: "x",
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

const iv = (key: string, startMin: number, endMin: number): ImportInterval => ({
  key,
  date: "2026-06-10",
  startMin,
  endMin,
});

describe("findConflicts", () => {
  it("nessuna sovrapposizione → mappa vuota", () => {
    const out = findConflicts([iv("a", 540, 600), iv("b", 600, 660)], []);
    expect(out.size).toBe(0);
  });

  it("segnala la sovrapposizione con un'attività esistente", () => {
    const entries = [entry("2026-06-10T09:00:00", "2026-06-10T10:00:00")];
    const out = findConflicts([iv("a", 570, 630)], entries);
    expect(out.get("a")).toMatch(/esistente/);
  });

  it("segnala la sovrapposizione tra due righe importate", () => {
    const out = findConflicts([iv("a", 540, 615), iv("b", 600, 660)], []);
    expect(out.get("a")).toMatch(/riga/);
    expect(out.get("b")).toMatch(/riga/);
  });

  it("distingue il conflitto doppio (esistente + riga)", () => {
    const entries = [entry("2026-06-10T09:00:00", "2026-06-10T10:00:00")];
    const out = findConflicts([iv("a", 570, 630), iv("b", 600, 660)], entries);
    expect(out.get("a")).toMatch(/esistente e a un'altra riga/);
  });

  it("righe in giorni diversi non confliggono", () => {
    const out = findConflicts(
      [iv("a", 540, 600), { key: "b", date: "2026-06-11", startMin: 540, endMin: 600 }],
      [],
    );
    expect(out.size).toBe(0);
  });
});
