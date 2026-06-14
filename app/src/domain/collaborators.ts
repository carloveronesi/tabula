import type { Id, Project } from "@/data/types";

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
