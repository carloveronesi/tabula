import { db } from "@/data/db";
import { buildExport, type TabulaExport } from "@/data/export/buildExport";

/**
 * Raccoglie l'intero archivio da IndexedDB e ne costruisce il documento di
 * export nativo. L'unico effetto è la lettura del DB; il montaggio è puro
 * (`buildExport`). `now` iniettabile per i test.
 */
export async function collectExport(now: number = Date.now()): Promise<TabulaExport> {
  const [
    entries,
    clients,
    projects,
    people,
    contacts,
    recurrences,
    todos,
    days,
    settingsRows,
  ] = await Promise.all([
    db.entries.toArray(),
    db.clients.toArray(),
    db.projects.toArray(),
    db.people.toArray(),
    db.contacts.toArray(),
    db.recurrences.toArray(),
    db.todos.toArray(),
    db.days.toArray(),
    db.settings.toArray(),
  ]);

  return buildExport(
    {
      entries,
      clients,
      projects,
      people,
      contacts,
      recurrences,
      todos,
      days,
      settings: settingsRows[0] ?? null,
    },
    now,
  );
}
