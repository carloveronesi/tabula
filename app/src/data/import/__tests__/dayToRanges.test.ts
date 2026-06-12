import { describe, it, expect } from "vitest";
import { dayToRanges, type DaySlotConfig } from "@/data/import/dayToRanges";
import type { SourceDay, SourceEntry } from "@/data/import/sourceTypes";

const CONFIG: DaySlotConfig = {
  morningStart: 540, // 09:00
  morningEnd: 780, // 13:00
  afternoonStart: 840, // 14:00
  afternoonEnd: 1080, // 18:00
  slotMinutes: 30,
};

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

function day(over: Partial<SourceDay> = {}): SourceDay {
  return { AM: null, PM: null, location: null, ...over };
}

const DATE = "2026-06-15";

describe("dayToRanges", () => {
  it("giorno senza attività (solo location) → []", () => {
    expect(dayToRanges(DATE, day({ location: "office" }), CONFIG)).toEqual([]);
  });

  it("giornata intera (AM === PM) → un range 09:00–18:00", () => {
    const ferie = entry("Ferie", { type: "vacation" });
    const ranges = dayToRanges(DATE, day({ AM: ferie, PM: { ...ferie } }), CONFIG);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      startsAt: "2026-06-15T09:00:00",
      endsAt: "2026-06-15T18:00:00",
    });
    expect(ranges[0].entry.title).toBe("Ferie");
  });

  it("solo AM → 09:00–13:00", () => {
    const ranges = dayToRanges(DATE, day({ AM: entry("Mattina") }), CONFIG);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      startsAt: "2026-06-15T09:00:00",
      endsAt: "2026-06-15T13:00:00",
    });
  });

  it("solo PM → 14:00–18:00", () => {
    const ranges = dayToRanges(DATE, day({ PM: entry("Pomeriggio") }), CONFIG);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      startsAt: "2026-06-15T14:00:00",
      endsAt: "2026-06-15T18:00:00",
    });
  });

  it("AM e PM diversi → due range distinti", () => {
    const ranges = dayToRanges(DATE, day({ AM: entry("A"), PM: entry("B") }), CONFIG);
    expect(ranges).toHaveLength(2);
    expect(ranges.map((r) => r.entry.title)).toEqual(["A", "B"]);
    expect(ranges[0]).toMatchObject({
      startsAt: "2026-06-15T09:00:00",
      endsAt: "2026-06-15T13:00:00",
    });
    expect(ranges[1]).toMatchObject({
      startsAt: "2026-06-15T14:00:00",
      endsAt: "2026-06-15T18:00:00",
    });
  });

  it("se hours è presente, prevale su AM/PM e fonde i range", () => {
    const e = entry("Evento", { type: "event" });
    const hours = Object.fromEntries(
      ["14:00", "14:30", "15:00"].map((s) => [s, { ...e }]),
    );
    const ranges = dayToRanges(DATE, day({ AM: entry("ignorata"), hours }), CONFIG);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      startsAt: "2026-06-15T14:00:00",
      endsAt: "2026-06-15T15:30:00",
    });
    expect(ranges[0].entry.title).toBe("Evento");
  });

  it("rispetta una configurazione orari diversa", () => {
    const custom: DaySlotConfig = { ...CONFIG, morningStart: 480, morningEnd: 720 };
    const ranges = dayToRanges(DATE, day({ AM: entry("Presto") }), custom);
    expect(ranges[0]).toMatchObject({
      startsAt: "2026-06-15T08:00:00",
      endsAt: "2026-06-15T12:00:00",
    });
  });
});
