import type { Id } from "@/data/types";

/**
 * Riscrive una lista di id: sostituisce `from` con `to` (merge) oppure lo
 * rimuove (delete, `to === null`). Deduplica e preserva l'ordine. Se `from` non
 * è presente ritorna l'array originale *per riferimento*, così chi chiama può
 * saltare le scritture inutili con un confronto di identità. Pura.
 */
export function remapIds(ids: Id[], from: Id, to: Id | null): Id[] {
  if (!ids.includes(from)) return ids;
  const out: Id[] = [];
  for (const id of ids) {
    const next = id === from ? to : id;
    if (next !== null && !out.includes(next)) out.push(next);
  }
  return out;
}
