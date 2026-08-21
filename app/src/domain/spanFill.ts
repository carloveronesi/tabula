import type { Entry, EntryType, ISODate } from "@/data/types";
import { addDays, isoDate, isWorkingDate } from "@/domain/calendarNav";
import { dayPresets, type WorkHours } from "@/domain/slots";

/** Una fascia da creare: giorno + orario, il materiale di una Entry. */
export interface SpanSlot {
  date: ISODate;
  startMin: number;
  endMin: number;
}

/**
 * Giorni riempibili in un intervallo trascinato sul Mese: i feriali
 * (`workingDays`, festivi esclusi) che non hanno già attività. `from`/`to` in
 * qualsiasi ordine; il risultato è crescente. Pura.
 */
export function spanDays(
  from: Date,
  to: Date,
  opts: { workingDays: number[]; patronDay: string; entries: Entry[] },
): ISODate[] {
  const [first, last] = from <= to ? [from, to] : [to, from];
  const busy = new Set(opts.entries.map((e) => e.startsAt.slice(0, 10)));
  const out: ISODate[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (!isWorkingDate(d, opts.workingDays, opts.patronDay)) continue;
    const key = isoDate(d);
    if (!busy.has(key)) out.push(key);
  }
  return out;
}

/**
 * Fasce da creare su ogni giorno, in base al tipo: le ferie sono un blocco solo
 * dalla mattina alla sera (la pausa la scarta già `workedMinutes`), tutto il
 * resto è mattina + pomeriggio, così il pranzo resta libero. Pura.
 */
export function spanSlots(
  days: ISODate[],
  type: EntryType,
  wh: WorkHours,
): SpanSlot[] {
  const shape = dayPresets(wh).filter((p) =>
    type === "vacation" ? p.id === "full" : p.id !== "full",
  );
  return days.flatMap((date) =>
    shape.map((p) => ({ date, startMin: p.startMin, endMin: p.endMin })),
  );
}
