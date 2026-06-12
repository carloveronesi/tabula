import { db } from "@/data/db";
import type { ImportResult } from "@/data/import/importer";

/**
 * Scrive il risultato di un import su IndexedDB in un'unica transazione.
 * `bulkPut` è idempotente per id: un re-import sovrascrive senza duplicare.
 */
export async function persistImport(result: ImportResult): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    await db.entries.bulkPut(result.entries);
    await db.clients.bulkPut(result.clients);
    await db.projects.bulkPut(result.projects);
    await db.people.bulkPut(result.people);
    await db.contacts.bulkPut(result.contacts);
    await db.recurrences.bulkPut(result.recurrences);
    await db.todos.bulkPut(result.todos);
    await db.days.bulkPut(result.days);
  });
}
