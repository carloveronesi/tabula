import { describe, it, expect } from "vitest";
import { presenceBreakdown } from "@/domain/presence";
import type { Location } from "@/data/types";

const noTargets = { officeTargetPct: 0, clientTargetPct: 0 };
const row = (b: ReturnType<typeof presenceBreakdown>, loc: Location) =>
  b.rows.find((r) => r.location === loc)!;

describe("presenceBreakdown", () => {
  it("calcola le quote sui giorni feriali, non sui soli giorni con sede", () => {
    // 4 feriali, 2 con sede: ufficio è 1/4 = 25%, non 1/2.
    const b = presenceBreakdown(
      ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"],
      { "2026-06-01": "office", "2026-06-02": "client" },
      noTargets,
    );
    expect(b.workingDays).toBe(4);
    expect(b.tracked).toBe(2);
    expect(b.untracked).toBe(2);
    expect(row(b, "office").pct).toBe(25);
    expect(row(b, "client").pct).toBe(25);
    expect(row(b, "remote").pct).toBe(0);
  });

  it("ignora le sedi su giorni non feriali", () => {
    const b = presenceBreakdown(
      ["2026-06-01"],
      { "2026-06-01": "office", "2026-06-06": "client" }, // 06 sabato, fuori
      noTargets,
    );
    expect(b.workingDays).toBe(1);
    expect(b.tracked).toBe(1);
    expect(row(b, "client").days).toBe(0);
  });

  it("restituisce sempre le tre sedi in ordine fisso", () => {
    const b = presenceBreakdown([], {}, noTargets);
    expect(b.workingDays).toBe(0);
    expect(b.rows.map((r) => r.location)).toEqual(["remote", "office", "client"]);
    expect(b.rows.every((r) => r.pct === 0 && r.days === 0)).toBe(true);
  });

  it("espone i target di ufficio/cliente; remoto non ne ha; 0 = non impostato", () => {
    const b = presenceBreakdown(["2026-06-01"], {}, {
      officeTargetPct: 50,
      clientTargetPct: 0,
    });
    expect(row(b, "office").targetPct).toBe(50);
    expect(row(b, "client").targetPct).toBeNull();
    expect(row(b, "remote").targetPct).toBeNull();
  });
});
