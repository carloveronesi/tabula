/**
 * Presenze: quanti giorni del mese vanno fatti in presenza (ufficio o cliente)
 * e a che punto sei. Logica pura — la UI passa i feriali del mese, le ferie e
 * le sedi registrate.
 */
import type { ISODate, Location } from "@/data/types";

export const LOCATIONS = ["remote", "office", "client"] as const;

export const LOCATION_LABEL: Record<Location, string> = {
  remote: "Remoto",
  office: "Ufficio",
  client: "Cliente",
};

/** Ufficio e cliente valgono entrambi come presenza. */
export const isPresent = (loc: Location | null | undefined) =>
  loc === "office" || loc === "client";

export interface MonthPresence {
  /** Feriali del mese. */
  workingDays: number;
  /** Feriali di ferie intera: escono dalla base. */
  vacationDays: number;
  /** Feriali meno ferie: la base dell'obiettivo. */
  baseDays: number;
  /** Giorni in presenza richiesti (per eccesso); 0 se l'obiettivo non è impostato. */
  required: number;
  /** Giorni per sede sulla base: registrati, o la predefinita sui giorni trascorsi. */
  days: Record<Location, number>;
  /** Ufficio + cliente, trascorsi e già pianificati. */
  present: number;
  /** Di cui pianificati (giorni futuri con sede ufficio/cliente). */
  planned: number;
  /** Giorni futuri ancora senza sede: dove si possono piazzare le presenze. */
  open: number;
  /** Gli stessi, in ordine di data. */
  openDates: ISODate[];
  /** Presenze che mancano all'obiettivo. */
  missing: number;
}

/**
 * Bilancio presenze del mese sui feriali meno le ferie intere. Un giorno già
 * trascorso (≤ `today`) senza sede conta come `defaultLocation`; uno futuro
 * senza sede resta "da decidere" (`open`).
 */
export function monthPresence(
  workingDates: ISODate[],
  vacationDates: ReadonlySet<ISODate>,
  metas: Record<ISODate, Location>,
  targetPct: number,
  defaultLocation: Location,
  today: ISODate,
): MonthPresence {
  const base = workingDates.filter((d) => !vacationDates.has(d));
  const days: Record<Location, number> = { remote: 0, office: 0, client: 0 };
  let planned = 0;
  const openDates: ISODate[] = [];
  for (const d of base) {
    const loc = metas[d] ?? (d <= today ? defaultLocation : null);
    if (!loc) {
      openDates.push(d);
      continue;
    }
    days[loc] += 1;
    if (d > today && isPresent(loc)) planned += 1;
  }
  const present = days.office + days.client;
  const required = Math.ceil((base.length * targetPct) / 100);
  return {
    workingDays: workingDates.length,
    vacationDays: workingDates.length - base.length,
    baseDays: base.length,
    required,
    days,
    present,
    planned,
    open: openDates.length,
    openDates,
    missing: Math.max(0, required - present),
  };
}

/**
 * Suggerimenti per il planning: i giorni ancora liberi che cadono in un giorno
 * della settimana preferito (`dow`: 0 = lunedì), in ordine di data, fino a
 * coprire le presenze mancanti. Se i preferiti non bastano ne restituisce meno.
 */
export function suggestPresenceDays(
  p: MonthPresence,
  preferredDays: number[],
  dow: (d: ISODate) => number,
): ISODate[] {
  return p.openDates
    .filter((d) => preferredDays.includes(dow(d)))
    .slice(0, p.missing);
}

/** Click in planning: nessuna/remoto → ufficio → cliente → nessuna. */
export function nextPlannedLocation(current: Location | null | undefined): Location | null {
  if (current === "office") return "client";
  if (current === "client") return null;
  return "office";
}
