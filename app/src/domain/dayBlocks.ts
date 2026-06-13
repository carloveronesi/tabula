import type { Entry, ISODate } from "@/data/types";
import { entryRowSpan, minutesOfDay } from "@/domain/slots";

export interface PositionedEntry {
  entry: Entry;
  startRow: number;
  span: number;
}

/**
 * Entry di un giorno posizionate sulla griglia a slot: filtra per data e
 * scarta quelle che non iniziano su uno slot lavorativo. Condivisa da DayView
 * e WeekGrid per non duplicare la logica di posizionamento.
 */
export function entryBlocks(
  entries: Entry[],
  dayKey: ISODate,
  slots: number[],
): PositionedEntry[] {
  const out: PositionedEntry[] = [];
  for (const e of entries) {
    if (e.startsAt.slice(0, 10) !== dayKey) continue;
    const pos = entryRowSpan(minutesOfDay(e.startsAt), minutesOfDay(e.endsAt), slots);
    if (pos) out.push({ entry: e, startRow: pos.startRow, span: pos.span });
  }
  return out;
}
