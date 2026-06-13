import { describe, it, expect } from "vitest";
import { conflictsOnDay } from "@/domain/conflict";
import type { Entry, ISODateTime } from "@/data/types";

function entry(id: string, startsAt: ISODateTime, endsAt: ISODateTime): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: id,
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

const E = [entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00")];

describe("conflictsOnDay", () => {
  it("rileva la sovrapposizione nello stesso giorno", () => {
    expect(conflictsOnDay("2026-06-10", 570, 630, E, null)).toBe(true);
  });

  it("intervalli adiacenti non sono conflitto (estremi aperti)", () => {
    expect(conflictsOnDay("2026-06-10", 600, 660, E, null)).toBe(false);
    expect(conflictsOnDay("2026-06-10", 480, 540, E, null)).toBe(false);
  });

  it("ignora se stessa via ignoreId", () => {
    expect(conflictsOnDay("2026-06-10", 570, 630, E, "a")).toBe(false);
  });

  it("nessun conflitto in un altro giorno", () => {
    expect(conflictsOnDay("2026-06-11", 540, 600, E, null)).toBe(false);
  });
});
