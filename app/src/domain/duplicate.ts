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
 * Dove incollare una copia in `date`: prova a conservare l'orario originale
 * (`preferredStartMin`) se rientra nella giornata lavorativa ed è libero;
 * altrimenti ripiega sul primo intervallo libero. `null` se non c'è spazio.
 * Pura.
 */
export function pastePlacement(
  entries: Entry[],
  date: ISODate,
  durationMin: number,
  preferredStartMin: number,
  bounds: DayBounds,
  slotMinutes: number,
): { startMin: number; endMin: number } | null {
  const end = preferredStartMin + durationMin;
  if (
    preferredStartMin >= bounds.startMin &&
    end <= bounds.endMin &&
    !conflictsOnDay(date, preferredStartMin, end, entries, null)
  ) {
    return { startMin: preferredStartMin, endMin: end };
  }
  return firstFreeRange(entries, date, durationMin, bounds, slotMinutes);
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
