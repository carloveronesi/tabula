import { describe, it, expect } from "vitest";
import { entryBlocks } from "@/domain/dayBlocks";
import { buildSlots, type WorkHours } from "@/domain/slots";
import type { Entry, ISODateTime } from "@/data/types";

const WH: WorkHours = {
  morningStart: 540,
  morningEnd: 780,
  afternoonStart: 840,
  afternoonEnd: 1080,
};
const SLOTS = buildSlots(WH, 30).all;

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

describe("entryBlocks", () => {
  it("tiene solo le entry del giorno dato, posizionate", () => {
    const entries = [
      entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00"),
      entry("b", "2026-06-11T09:00:00", "2026-06-11T10:00:00"),
    ];
    const blocks = entryBlocks(entries, "2026-06-10", SLOTS);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ startRow: 0, span: 2 });
    expect(blocks[0].entry.id).toBe("a");
  });

  it("scarta le entry che iniziano fuori dagli slot lavorativi", () => {
    const entries = [entry("x", "2026-06-10T08:00:00", "2026-06-10T08:30:00")];
    expect(entryBlocks(entries, "2026-06-10", SLOTS)).toEqual([]);
  });

  it("posiziona un blocco pomeridiano", () => {
    const entries = [entry("p", "2026-06-10T14:00:00", "2026-06-10T15:00:00")];
    const blocks = entryBlocks(entries, "2026-06-10", SLOTS);
    expect(blocks[0]).toMatchObject({ startRow: 8, span: 2 });
  });
});
