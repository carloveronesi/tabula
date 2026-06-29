import type { Entry, Id, Project } from "@/data/types";

/**
 * Persone candidate come collaboratori per un dato cliente/progetto.
 * Fonte: i `teamIds` dei progetti (nessun legame diretto persona→cliente).
 * - con `projectId`: il team di quel progetto;
 * - con solo `clientId`: l'unione dei team di tutti i progetti del cliente;
 * - senza nessuno dei due: nessun candidato.
 * Ordine stabile, id deduplicati.
 */
export function collaboratorCandidateIds(
  projects: Project[],
  projectId: Id | null,
  clientId: Id | null,
): Id[] {
  const source = projectId
    ? projects.filter((p) => p.id === projectId)
    : clientId
      ? projects.filter((p) => p.clientId === clientId)
      : [];

  const seen = new Set<Id>();
  const out: Id[] = [];
  for (const p of source) {
    for (const id of p.teamIds) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/**
 * Riordina i candidati per frequenza di collaborazione reale: chi compare più
 * spesso come collaboratore sulle entry di quel progetto (o, in mancanza, di
 * quel cliente) sale in cima. A parità di frequenza — e per chi non ha storico —
 * si conserva l'ordine d'ingresso (il team del progetto). Pura.
 */
export function rankCandidatesByHistory(
  candidateIds: Id[],
  entries: Entry[],
  projectId: Id | null,
  clientId: Id | null,
): Id[] {
  const freq = new Map<Id, number>();
  for (const e of entries) {
    const match = projectId
      ? e.projectId === projectId
      : clientId
        ? e.clientId === clientId
        : false;
    if (!match) continue;
    for (const id of e.collaboratorIds) freq.set(id, (freq.get(id) ?? 0) + 1);
  }
  return candidateIds
    .map((id, i) => ({ id, i, f: freq.get(id) ?? 0 }))
    .sort((a, b) => b.f - a.f || a.i - b.i)
    .map((x) => x.id);
}
