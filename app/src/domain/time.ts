import type { Entry, ISODate, ISODateTime } from "@/data/types";

type Range = Pick<Entry, "startsAt" | "endsAt">;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Combina una data e i minuti dalla mezzanotte in una ISODateTime locale. */
export function dateTimeAt(date: ISODate, minutes: number): ISODateTime {
  return `${date}T${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}:00`;
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
