import { normalizeName } from "@/domain/teams/matchPerson";

/**
 * Cerca un record con lo stesso nome (confronto normalizzato: case, spazi,
 * accenti, punteggiatura). Serve a riusare una persona/contatto esistente alla
 * creazione al volo, invece di generare un doppione. Pura.
 */
export function findByName<T extends { name: string }>(
  items: T[],
  name: string,
): T | undefined {
  const target = normalizeName(name);
  if (!target) return undefined;
  return items.find((i) => normalizeName(i.name) === target);
}
