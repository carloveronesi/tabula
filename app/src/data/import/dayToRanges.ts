import type { ISODate, ISODateTime } from "@/data/types";
import type { SourceDay, SourceEntry } from "@/data/import/sourceTypes";
import { sameEntry } from "@/data/import/entryEquals";
import { mergeConsecutiveSlots } from "@/data/import/mergeSlots";

/** Confini orari (in minuti) e granularità per ricostruire i range del giorno. */
export interface DaySlotConfig {
  morningStart: number;
  morningEnd: number;
  afternoonStart: number;
  afternoonEnd: number;
  slotMinutes: number;
}

/** Un range di giornata con l'entry associata, in datetime ISO assoluto. */
export interface SourceRange {
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  entry: SourceEntry;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoAt(date: ISODate, minutes: number): ISODateTime {
  // Vincolo a [0, 1440] come dateTimeAt: 1440 = "24:00:00" (fine giornata),
  // niente ore ≥ 25 che lo slice e `new Date` leggerebbero in giorni diversi.
  const m = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  return `${date}T${pad2(Math.floor(m / 60))}:${pad2(m % 60)}:00`;
}

/**
 * Converte un giorno del formato di import in range a datetime ISO.
 * Precedenza: se `hours` è popolato prevale su AM/PM.
 * `location` è informazione di giorno, gestita altrove (DayMeta), non qui.
 */
export function dayToRanges(
  date: ISODate,
  day: SourceDay,
  config: DaySlotConfig,
): SourceRange[] {
  if (day.hours && Object.keys(day.hours).length > 0) {
    return mergeConsecutiveSlots(day.hours, config.slotMinutes).map((r) => ({
      startsAt: isoAt(date, r.startMin),
      endsAt: isoAt(date, r.endMin),
      entry: r.entry,
    }));
  }

  const { AM, PM } = day;
  const range = (start: number, end: number, entry: SourceEntry): SourceRange => ({
    startsAt: isoAt(date, start),
    endsAt: isoAt(date, end),
    entry,
  });

  if (AM && PM && sameEntry(AM, PM)) {
    return [range(config.morningStart, config.afternoonEnd, AM)];
  }

  const ranges: SourceRange[] = [];
  if (AM) ranges.push(range(config.morningStart, config.morningEnd, AM));
  if (PM) ranges.push(range(config.afternoonStart, config.afternoonEnd, PM));
  return ranges;
}
