import type { Entry, ISODate, ISODateTime } from "@/data/types";
import { minutesOfDay, type WorkHours } from "@/domain/slots";

type Range = Pick<Entry, "startsAt" | "endsAt">;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Minuti in una giornata; `MIN_PER_DAY` (1440) = mezzanotte di fine giornata. */
const MIN_PER_DAY = 24 * 60;

/**
 * Combina una data e i minuti dalla mezzanotte in una ISODateTime locale.
 *
 * I minuti sono vincolati a [0, 1440]: 1440 è la fine giornata e dà "24:00:00"
 * (ISO 8601 valido per la mezzanotte di chiusura), che `minutesOfDay` rilegge
 * come 1440 — invariante su cui poggiano conflitti e copertura. Il clamp evita
 * che un valore fuori scala produca un orario come "25:30:00", letto 1530 dallo
 * slice ma spostato al giorno dopo da `new Date`: due verità in disaccordo.
 */
export function dateTimeAt(date: ISODate, minutes: number): ISODateTime {
  const clamped = Math.max(0, Math.min(MIN_PER_DAY, Math.round(minutes)));
  return `${date}T${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}:00`;
}

/**
 * Overlap come confronto di range (le ISODateTime sono ordinabili lessicograficamente).
 * Niente scansione di slot: il nuovo modello tiene il range, non N copie.
 */
export function overlaps(a: Range, b: Range): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/** Durata in minuti tra due ISODateTime. */
export function durationMinutes(range: Range): number {
  const start = new Date(range.startsAt).getTime();
  const end = new Date(range.endsAt).getTime();
  return Math.round((end - start) / 60000);
}

/**
 * Minuti effettivamente lavorati di una entry: la durata meno la parte che
 * cade nella pausa pranzo [morningEnd, afternoonStart). Una entry a tutto-giorno
 * (es. ferie 9:00–18:00) attraversa la pausa; contarla a muro gonfia il totale
 * di un'ora che il modello considera non lavorata (gli slot la saltano, la
 * giornata attesa è mattino+pomeriggio). Senza pausa coincide con durationMinutes.
 */
export function workedMinutes(range: Range, wh: WorkHours): number {
  const total = durationMinutes(range);
  if (wh.afternoonStart <= wh.morningEnd) return total;
  const overlap =
    Math.min(minutesOfDay(range.endsAt), wh.afternoonStart) -
    Math.max(minutesOfDay(range.startsAt), wh.morningEnd);
  return overlap > 0 ? total - overlap : total;
}
