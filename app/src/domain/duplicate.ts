import type { Entry, Id, ISODate } from "@/data/types";
import { conflictsOnDay } from "@/domain/conflict";
import { dateTimeAt } from "@/domain/time";

export interface DayBounds {
  startMin: number;
  endMin: number;
}

/**
 * Primo intervallo libero di durata `durationMin` nel giorno `date`, cercando
 * dall'inizio della giornata lavorativa a passi di `slotMinutes`. Rispetta "una
 * cosa alla volta": salta gli intervalli che si sovrappongono a entry esistenti.
 * `null` se non c'è spazio. Pura.
 */
export function firstFreeRange(
  entries: Entry[],
  date: ISODate,
  durationMin: number,
  bounds: DayBounds,
  slotMinutes: number,
): { startMin: number; endMin: number } | null {
  for (
    let start = bounds.startMin;
    start + durationMin <= bounds.endMin;
    start += slotMinutes
  ) {
    const end = start + durationMin;
    if (!conflictsOnDay(date, start, end, entries, null)) {
      return { startMin: start, endMin: end };
    }
  }
  return null;
}

/**
 * Copia di una entry posizionata in `date`/`startMin`–`endMin`, con nuovo `id`
 * e timestamp `now`. Mantiene contenuto e classificazione dell'originale. Pura.
 */
export function duplicateEntry(
  entry: Entry,
  date: ISODate,
  startMin: number,
  endMin: number,
  id: Id,
  now: number,
): Entry {
  return {
    ...entry,
    id,
    startsAt: dateTimeAt(date, startMin),
    endsAt: dateTimeAt(date, endMin),
    createdAt: now,
    updatedAt: now,
  };
}
