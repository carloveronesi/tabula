import type { Entry, Id, ISODate } from "@/data/types";
import { conflictsOnDay } from "@/domain/conflict";
import { minutesOfDay } from "@/domain/slots";
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
 * Minuti liberi consecutivi a partire da `startMin` in `date`: dalla start fino
 * alla entry successiva (o alla fine della giornata), `0` se `startMin` è fuori
 * dalla giornata lavorativa o cade dentro una entry esistente. Pura.
 */
export function freeSpanAt(
  entries: Entry[],
  date: ISODate,
  startMin: number,
  bounds: DayBounds,
): number {
  if (startMin < bounds.startMin || startMin >= bounds.endMin) return 0;
  let end = bounds.endMin;
  for (const e of entries) {
    if (e.startsAt.slice(0, 10) !== date) continue;
    const eStart = minutesOfDay(e.startsAt);
    const eEnd = minutesOfDay(e.endsAt);
    if (eStart <= startMin && startMin < eEnd) return 0; // start occupato
    if (eStart >= startMin && eStart < end) end = eStart; // limita alla prossima
  }
  return end - startMin;
}

/**
 * Dove incollare una copia in `date`: prova a conservare l'orario originale
 * (`preferredStartMin`) se rientra nella giornata lavorativa ed è libero;
 * altrimenti ripiega sul primo intervallo libero. Con `allowShrink` (incollo
 * mirato su uno slot), se la fascia preferita è libera ma più corta della copia
 * la accorcia per farla stare nel buco invece di ripiegare. `null` se non c'è
 * spazio. Pura.
 */
export function pastePlacement(
  entries: Entry[],
  date: ISODate,
  durationMin: number,
  preferredStartMin: number,
  bounds: DayBounds,
  slotMinutes: number,
  allowShrink = false,
): { startMin: number; endMin: number } | null {
  const span = freeSpanAt(entries, date, preferredStartMin, bounds);
  if (span >= durationMin) {
    return { startMin: preferredStartMin, endMin: preferredStartMin + durationMin };
  }
  if (allowShrink && span > 0) {
    return { startMin: preferredStartMin, endMin: preferredStartMin + span };
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
