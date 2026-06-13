import type { Entry, Id, ISODate } from "@/data/types";
import { minutesOfDay } from "@/domain/slots";

/**
 * Vero se l'intervallo [startMin, endMin) in `dayKey` si sovrappone a un'altra
 * entry dello stesso giorno (estremi aperti: gli intervalli adiacenti non
 * confliggono). `ignoreId` esclude l'entry che si sta spostando/ridimensionando.
 * Riflette il modello "una cosa alla volta": niente attività sovrapposte.
 */
export function conflictsOnDay(
  dayKey: ISODate,
  startMin: number,
  endMin: number,
  entries: Entry[],
  ignoreId: Id | null,
): boolean {
  return entries.some((e) => {
    if (e.id === ignoreId) return false;
    if (e.startsAt.slice(0, 10) !== dayKey) return false;
    const eStart = minutesOfDay(e.startsAt);
    const eEnd = minutesOfDay(e.endsAt);
    return startMin < eEnd && eStart < endMin;
  });
}
