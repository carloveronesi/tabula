import { describe, it, expect } from "vitest";
import { spanDays, spanSlots } from "@/domain/spanFill";
import type { Entry, ISODate } from "@/data/types";

const WH = { morningStart: 540, morningEnd: 780, afternoonStart: 840, afternoonEnd: 1080 };
const WORKING = [0, 1, 2, 3, 4]; // lun–ven

const at = (iso: ISODate) =>
  ({ id: iso, startsAt: `${iso}T09:00:00`, endsAt: `${iso}T10:00:00` }) as Entry;

const opts = (entries: Entry[] = [], patronDay = "") => ({
  workingDays: WORKING,
  patronDay,
  entries,
});

describe("spanDays", () => {
  // 2026-06-15 è un lunedì.
  const mon = new Date(2026, 5, 15);
  const sun = new Date(2026, 5, 21);

  it("prende i feriali dell'intervallo, weekend esclusi", () => {
    expect(spanDays(mon, sun, opts())).toEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19",
    ]);
  });

  it("va anche a ritroso: l'ordine del risultato è crescente", () => {
    expect(spanDays(sun, mon, opts())).toEqual(spanDays(mon, sun, opts()));
  });

  it("salta i giorni che hanno già attività", () => {
    const days = spanDays(mon, sun, opts([at("2026-06-17")]));
    expect(days).not.toContain("2026-06-17");
    expect(days).toHaveLength(4);
  });

  it("salta i festivi, patrono compreso", () => {
    // 2026-06-02 (Repubblica) è un martedì; il patrono è il 24 giugno.
    const jun1 = new Date(2026, 5, 1);
    expect(spanDays(jun1, new Date(2026, 5, 3), opts())).toEqual([
      "2026-06-01",
      "2026-06-03",
    ]);
    expect(
      spanDays(new Date(2026, 5, 24), new Date(2026, 5, 24), opts([], "06-24")),
    ).toEqual([]);
  });

  it("un solo giorno resta un solo giorno", () => {
    expect(spanDays(mon, mon, opts())).toEqual(["2026-06-15"]);
  });
});

describe("spanSlots", () => {
  const days: ISODate[] = ["2026-06-15", "2026-06-16"];

  it("attività normale: mattina + pomeriggio, pranzo libero", () => {
    expect(spanSlots(days, "client", WH)).toEqual([
      { date: "2026-06-15", startMin: 540, endMin: 780 },
      { date: "2026-06-15", startMin: 840, endMin: 1080 },
      { date: "2026-06-16", startMin: 540, endMin: 780 },
      { date: "2026-06-16", startMin: 840, endMin: 1080 },
    ]);
  });

  it("ferie: un blocco solo per giorno, dalla mattina alla sera", () => {
    expect(spanSlots(days, "vacation", WH)).toEqual([
      { date: "2026-06-15", startMin: 540, endMin: 1080 },
      { date: "2026-06-16", startMin: 540, endMin: 1080 },
    ]);
  });

  it("senza giorni non produce niente", () => {
    expect(spanSlots([], "client", WH)).toEqual([]);
  });
});
