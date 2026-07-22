import { describe, it, expect } from "vitest";
import { budgetProgress } from "@/domain/budget";

describe("budgetProgress", () => {
  it("nessuna stima → hasEstimate false", () => {
    expect(budgetProgress(600, 0)).toEqual({
      hasEstimate: false,
      pct: 0,
      overBudget: false,
      overMin: 0,
    });
  });

  it("entro il budget", () => {
    // 20h su 40h stimate
    expect(budgetProgress(20 * 60, 40)).toMatchObject({ pct: 50, overBudget: false, overMin: 0 });
  });

  it("in sforo: pct oltre 100 e overMin in minuti", () => {
    // 60h su 40h → 150%, 20h di sforo
    expect(budgetProgress(60 * 60, 40)).toMatchObject({
      pct: 150,
      overBudget: true,
      overMin: 20 * 60,
    });
  });

  it("esattamente al budget non è sforo", () => {
    expect(budgetProgress(40 * 60, 40)).toMatchObject({ pct: 100, overBudget: false });
  });
});
