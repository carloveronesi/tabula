import { describe, it, expect } from "vitest";
import { mergeConsecutiveSlots } from "@/data/import/mergeSlots";
import type { SourceEntry } from "@/data/import/sourceTypes";

/** Factory minima per un'entry con un titolo distintivo. */
function entry(title: string, over: Partial<SourceEntry> = {}): SourceEntry {
  return {
    type: "client",
    subtypeId: null,
    projectId: "prj_x",
    title,
    client: "ACME",
    collaborators: [],
    clientContacts: [],
    notes: "",
    wentWrong: "",
    nextSteps: "",
    links: [],
    milestone: null,
    ...over,
  };
}

/** Costruisce una mappa hours replicando `e` su ogni slot. */
function fillSlots(slots: string[], e: SourceEntry): Record<string, SourceEntry> {
  return Object.fromEntries(slots.map((s) => [s, { ...e }]));
}

describe("mergeConsecutiveSlots", () => {
  it("ritorna [] per hours vuoto", () => {
    expect(mergeConsecutiveSlots({})).toEqual([]);
  });

  it("fonde copie consecutive identiche in un solo range", () => {
    const e = entry("Sviluppo");
    const hours = fillSlots(["09:00", "09:30", "10:00", "10:30"], e);

    const ranges = mergeConsecutiveSlots(hours);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ startMin: 540, endMin: 660 });
    expect(ranges[0].entry.title).toBe("Sviluppo");
  });

  it("separa entry diverse adiacenti", () => {
    const hours = { "09:00": entry("A"), "09:30": entry("B") };

    const ranges = mergeConsecutiveSlots(hours);

    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({ startMin: 540, endMin: 570 });
    expect(ranges[1]).toMatchObject({ startMin: 570, endMin: 600 });
    expect(ranges.map((r) => r.entry.title)).toEqual(["A", "B"]);
  });

  it("NON fonde la stessa entry attraverso un buco temporale", () => {
    const e = entry("Call");
    const hours = { "09:00": { ...e }, "11:00": { ...e } };

    const ranges = mergeConsecutiveSlots(hours);

    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({ startMin: 540, endMin: 570 });
    expect(ranges[1]).toMatchObject({ startMin: 660, endMin: 690 });
  });

  it("ordina gli slot anche se la mappa non è ordinata", () => {
    const e = entry("Riunione");
    const hours = fillSlots(["17:30", "17:00"], e);

    const ranges = mergeConsecutiveSlots(hours);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ startMin: 1020, endMin: 1080 });
  });

  it("rispetta slotMinutes diverso (15 min)", () => {
    const e = entry("Quick");
    const hours = fillSlots(["09:00", "09:15"], e);

    const ranges = mergeConsecutiveSlots(hours, 15);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ startMin: 540, endMin: 570 });
  });
});
