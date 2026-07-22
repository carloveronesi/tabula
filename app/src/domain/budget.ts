/**
 * Avanzamento sulle ore stimate di un progetto. Percentuale **non** limitata a
 * 100 (lo sforo dev'essere visibile); `overMin` sono i minuti oltre la stima.
 * `estimatedHours <= 0` = nessuna stima → tutto a zero, `hasEstimate` false.
 */
export function budgetProgress(loggedMin: number, estimatedHours: number) {
  const estMin = estimatedHours * 60;
  if (estMin <= 0) {
    return { hasEstimate: false, pct: 0, overBudget: false, overMin: 0 };
  }
  const pct = Math.round((loggedMin / estMin) * 100);
  return {
    hasEstimate: true,
    pct,
    overBudget: pct > 100,
    overMin: Math.max(0, loggedMin - estMin),
  };
}
