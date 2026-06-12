import type { Entry, Id } from "@/data/types";
import type { SourceEntry } from "@/data/import/sourceTypes";
import type { Inventory } from "@/data/import/buildInventory";

/** Campi dell'Entry derivati dalla source entry; id/range/timestamp aggiunti in assemblaggio. */
export type ResolvedEntryCore = Omit<
  Entry,
  "id" | "startsAt" | "endsAt" | "createdAt" | "updatedAt"
>;

/**
 * Mappa una entry del formato di import sui campi dell'Entry, risolvendo i
 * riferimenti in id opachi tramite l'inventario. I contatti sono rinviati.
 */
export function resolveEntry(
  source: SourceEntry,
  inventory: Inventory,
): ResolvedEntryCore {
  const projectId = source.projectId
    ? (inventory.projectIdBySourceId[source.projectId] ?? null)
    : null;
  const clientId = projectId
    ? (inventory.projects.find((p) => p.id === projectId)?.clientId ?? null)
    : null;
  const collaboratorIds = (source.collaborators ?? [])
    .map((name) => inventory.personIdByName[name])
    .filter((id): id is Id => Boolean(id));

  return {
    type: source.type,
    projectId,
    clientId,
    subtypeId: source.subtypeId ?? null,
    title: source.title,
    collaboratorIds,
    contactIds: [],
    notes: source.notes ?? "",
    blockers: source.wentWrong ?? "",
    nextSteps: source.nextSteps ?? "",
    links: source.links ?? [],
    milestone: source.milestone ?? null,
  };
}
