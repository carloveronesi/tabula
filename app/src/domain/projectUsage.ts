import type { Entry, Id } from "@/data/types";

/** Conteggio d'uso per progetto: quante entry referenziano ciascun projectId. */
export function projectUsage(entries: Entry[]): Map<Id, number> {
  const freq = new Map<Id, number>();
  for (const e of entries) {
    if (e.projectId) freq.set(e.projectId, (freq.get(e.projectId) ?? 0) + 1);
  }
  return freq;
}

/**
 * Ordina i progetti per frequenza d'uso reale (più usati in cima). A parità di
 * frequenza conserva l'ordine d'ingresso. Pura.
 */
export function rankProjectsByUsage<T extends { id: Id }>(
  projects: T[],
  entries: Entry[],
): T[] {
  const freq = projectUsage(entries);
  return projects
    .map((p, i) => ({ p, i, f: freq.get(p.id) ?? 0 }))
    .sort((a, b) => b.f - a.f || a.i - b.i)
    .map((x) => x.p);
}
