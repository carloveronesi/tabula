/**
 * Presenze: ripartizione delle sedi (remoto/ufficio/cliente) di un periodo e
 * confronto con gli obiettivi. Logica pura — la UI passa i giorni feriali del
 * periodo e le sedi registrate.
 */
import type { ISODate, Location } from "@/data/types";

export const LOCATIONS = ["remote", "office", "client"] as const;

export const LOCATION_LABEL: Record<Location, string> = {
  remote: "Remoto",
  office: "Ufficio",
  client: "Cliente",
};

export interface PresenceTargets {
  officeTargetPct: number;
  clientTargetPct: number;
}

export interface PresenceRow {
  location: Location;
  days: number;
  /** Quota sui giorni feriali del periodo (0–100, arrotondata). */
  pct: number;
  /** Obiettivo per la sede, o `null` se non impostato (remoto, o target a 0). */
  targetPct: number | null;
}

export interface PresenceBreakdown {
  /** Giorni feriali (lavorativi) del periodo: il denominatore delle quote. */
  workingDays: number;
  /** Giorni feriali con una sede registrata. */
  tracked: number;
  /** Giorni feriali senza sede registrata. */
  untracked: number;
  rows: PresenceRow[];
}

/**
 * Ripartizione delle presenze sui **giorni feriali** del periodo: per ciascuno
 * dei `workingDates` legge la sede da `metas` e calcola le quote sul totale dei
 * feriali (così le percentuali sono confrontabili con gli obiettivi mensili).
 * Le sedi su giorni non feriali sono ignorate. Un target a 0 vale "non impostato".
 *
 * Se `defaultLocation` è valorizzato, i giorni feriali **senza** sede registrata
 * contano come quella sede ("predefinita salvo eccezioni"): in tal caso non
 * restano giorni non tracciati.
 */
export function presenceBreakdown(
  workingDates: ISODate[],
  metas: Record<ISODate, Location>,
  targets: PresenceTargets,
  defaultLocation: Location | null = null,
): PresenceBreakdown {
  const workingDays = workingDates.length;
  const counts: Record<Location, number> = { remote: 0, office: 0, client: 0 };
  let tracked = 0;
  for (const date of workingDates) {
    const loc = metas[date] ?? defaultLocation;
    if (loc) {
      counts[loc] += 1;
      if (metas[date]) tracked += 1;
    }
  }
  const target: Record<Location, number | null> = {
    remote: null,
    office: targets.officeTargetPct > 0 ? targets.officeTargetPct : null,
    client: targets.clientTargetPct > 0 ? targets.clientTargetPct : null,
  };
  const rows: PresenceRow[] = LOCATIONS.map((location) => ({
    location,
    days: counts[location],
    pct: workingDays > 0 ? Math.round((counts[location] / workingDays) * 100) : 0,
    targetPct: target[location],
  }));
  return { workingDays, tracked, untracked: workingDays - tracked, rows };
}
