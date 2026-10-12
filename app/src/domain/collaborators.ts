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

/** Quante volte ogni id compare nelle entry (via `idsOf`). */
function usageCount(entries: Entry[], idsOf: (e: Entry) => Id[]): Map<Id, number> {
  const freq = new Map<Id, number>();
  for (const e of entries) for (const id of idsOf(e)) freq.set(id, (freq.get(id) ?? 0) + 1);
  return freq;
}

/**
 * Riordina i candidati per frequenza di collaborazione reale: prima conta il
 * progetto, poi il cliente, poi tutto lo storico — così anche su un progetto
 * nuovo i colleghi abituali stanno in cima. A parità (e per chi non ha storico)
 * si conserva l'ordine d'ingresso (il team del progetto). Pura.
 */
export function rankCandidatesByHistory(
  candidateIds: Id[],
  entries: Entry[],
  projectId: Id | null,
  clientId: Id | null,
): Id[] {
  const collab = (e: Entry) => e.collaboratorIds;
  const onProject = usageCount(projectId ? entries.filter((e) => e.projectId === projectId) : [], collab);
  const onClient = usageCount(clientId ? entries.filter((e) => e.clientId === clientId) : [], collab);
  const overall = usageCount(entries, collab);
  const key = (id: Id) => [onProject.get(id) ?? 0, onClient.get(id) ?? 0, overall.get(id) ?? 0];
  return candidateIds
    .map((id, i) => ({ id, i, k: key(id) }))
    .sort((a, b) => b.k[0] - a.k[0] || b.k[1] - a.k[1] || b.k[2] - a.k[2] || a.i - b.i)
    .map((x) => x.id);
}

/**
 * Ordina persone (collaboratori o referenti) per quante attività le citano,
 * più frequenti in cima; a parità conserva l'ordine d'ingresso. Pura.
 */
export function rankByUsage<T extends { id: Id }>(
  items: T[],
  entries: Entry[],
  idsOf: (e: Entry) => Id[],
): T[] {
  const freq = usageCount(entries, idsOf);
  return items
    .map((x, i) => ({ x, i, f: freq.get(x.id) ?? 0 }))
    .sort((a, b) => b.f - a.f || a.i - b.i)
    .map((y) => y.x);
}

/**
 * Persone "di casa" su un progetto (o, in mancanza, su un cliente): chi compare
 * in almeno metà delle ultime `recent` attività lì sopra. Collaboratori e
 * referenti separati, ciascuno dal più frequente. Senza progetto né cliente, o
 * senza storico, liste vuote. Pura.
 */
export function frequentPeople(
  entries: Entry[],
  projectId: Id | null,
  clientId: Id | null,
  recent = 10,
): { collaboratorIds: Id[]; contactIds: Id[] } {
  const last = entries
    .filter((e) =>
      projectId ? e.projectId === projectId : clientId ? e.clientId === clientId : false,
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, recent);
  const threshold = Math.ceil(last.length / 2);
  const pick = (ids: (e: Entry) => Id[]) => {
    const freq = new Map<Id, number>();
    for (const e of last) for (const id of ids(e)) freq.set(id, (freq.get(id) ?? 0) + 1);
    return [...freq]
      .filter(([, f]) => f >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  };
  return {
    collaboratorIds: pick((e) => e.collaboratorIds),
    contactIds: pick((e) => e.contactIds),
  };
}
