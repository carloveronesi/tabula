import type { Entry, ISODate } from "@/data/types";
import { workedMinutes } from "@/domain/time";
import type { WorkHours } from "@/domain/slots";

/** Durata della giornata lavorativa piena (mattino + pomeriggio), in minuti. */
export function dailyWorkMinutes(wh: WorkHours): number {
  return wh.morningEnd - wh.morningStart + (wh.afternoonEnd - wh.afternoonStart);
}

/**
 * Minuti "disponibili" in un insieme di giorni feriali: giornata piena per ogni
 * giorno, meno le ferie registrate in quei giorni (una mezza giornata di ferie
 * lascia mezza capacità, una intera la azzera). Quello che resta scoperto dalle
 * attività è tempo non compilato. Pura — chi chiama passa già i soli feriali.
 */
export function availableMinutes(
  workingDates: ISODate[],
  entries: Entry[],
  wh: WorkHours,
): number {
  const full = workingDates.length * dailyWorkMinutes(wh);
  const dates = new Set(workingDates);
  let vacation = 0;
  for (const e of entries) {
    if (e.type === "vacation" && dates.has(e.startsAt.slice(0, 10)))
      vacation += workedMinutes(e, wh);
  }
  return Math.max(0, full - vacation);
}
