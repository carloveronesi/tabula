import type { ActivityTemplate, Entry, Id } from "@/data/types";
import type { EntryDraft } from "@/domain/entryDraft";

/**
 * Template = la classificazione di un'attività (titolo, tipo, cliente, progetto,
 * sottotipo) salvata per reinserirla con un clic. Niente fascia oraria: quella la
 * dà lo slot in cui lo si applica.
 */

/** Crea un template dalla classificazione di un'attività. Puro. */
export function templateFromEntry(
  entry: Entry,
  id: Id,
  now: number,
): ActivityTemplate {
  const title = entry.title.trim();
  return {
    id,
    name: title || "Senza titolo",
    title,
    type: entry.type,
    clientId: entry.clientId,
    projectId: entry.projectId,
    subtypeId: entry.subtypeId,
    createdAt: now,
  };
}

/** Applica un template a una bozza, conservandone giorno e fascia. Puro. */
export function applyTemplate(
  draft: EntryDraft,
  t: ActivityTemplate,
): EntryDraft {
  return {
    ...draft,
    title: t.title,
    type: t.type,
    clientId: t.clientId,
    projectId: t.projectId,
    subtypeId: t.subtypeId,
  };
}
