import type { Entry } from "@/data/types";

type Range = Pick<Entry, "startsAt" | "endsAt">;

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
