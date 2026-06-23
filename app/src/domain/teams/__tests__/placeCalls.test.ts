import { describe, it, expect } from "vitest";
import type { Person } from "@/data/types";
import type { WorkHours } from "@/domain/slots";
import type { ParsedCall } from "@/domain/teams/parseHistory";
import { buildProposals } from "@/domain/teams/placeCalls";

const WH: WorkHours = {
  morningStart: 540, // 09:00
  morningEnd: 780, // 13:00
  afternoonStart: 840, // 14:00
  afternoonEnd: 1080, // 18:00
};

const TODAY = new Date(2026, 5, 23); // martedì 23 giugno 2026

const people: Person[] = [{ id: "p1", name: "Martina Pastore" }];

function call(over: Partial<ParsedCall>): ParsedCall {
  return { name: "Tizio", direction: null, dayLabel: null, durationMin: 30, ...over };
}

const ctx = { people, contacts: [], workHours: WH, slotMinutes: 30, today: TODAY };

describe("buildProposals", () => {
  it("impila le chiamate dello stesso giorno dall'inizio giornata", () => {
    const calls = [
      call({ dayLabel: "Ieri", durationMin: 30 }),
      call({ dayLabel: "Ieri", durationMin: 60 }),
      call({ dayLabel: "Ieri", durationMin: 15 }),
    ];
    const out = buildProposals(calls, ctx);
    expect(out.map((p) => [p.startMin, p.endMin])).toEqual([
      [540, 570], // 09:00–09:30
      [570, 630], // 09:30–10:30
      [630, 645], // 10:30–10:45 (15 min occupa comunque uno slot)
    ]);
    expect(out.every((p) => p.date === "2026-06-22")).toBe(true);
  });

  it("ogni giorno riparte dal primo slot", () => {
    const calls = [
      call({ dayLabel: "Ieri", durationMin: 60 }),
      call({ dayLabel: "venerdì", durationMin: 30 }),
    ];
    const out = buildProposals(calls, ctx);
    expect(out[0]).toMatchObject({ date: "2026-06-22", startMin: 540 });
    expect(out[1]).toMatchObject({ date: "2026-06-19", startMin: 540 });
  });

  it("aggancia sempre l'inizio a uno slot lavorativo", () => {
    const slots = [540, 570, 600, 630, 660, 690, 720, 750, 840, 870];
    const calls = Array.from({ length: 4 }, () => call({ dayLabel: "Ieri" }));
    const out = buildProposals(calls, ctx);
    for (const p of out) expect(slots).toContain(p.startMin);
  });

  it("chiamate senza giorno ricadono su oggi", () => {
    const out = buildProposals([call({ dayLabel: null })], ctx);
    expect(out[0].date).toBe("2026-06-23");
  });

  it("collega il nome all'anagrafica quando combacia", () => {
    const out = buildProposals([call({ name: "Martina Pastore" })], ctx);
    expect(out[0].match).toMatchObject({ id: "p1", kind: "person" });
  });
});
