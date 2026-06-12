/**
 * Repository per store (Fase 1). CRUD tipizzato sopra Dexie.
 * Per ora solo helper sulle entry; gli altri store seguiranno.
 */
import { db } from "@/data/db";
import type { Entry, ISODate } from "@/data/types";

/** Le entry di un giorno: query sull'indice temporale, non lettura di un contenitore. */
export function entriesOfDay(date: ISODate): Promise<Entry[]> {
  return db.entries
    .where("startsAt")
    .between(`${date}T00:00`, `${date}T23:59`, true, true)
    .toArray();
}

export function putEntry(entry: Entry): Promise<string> {
  return db.entries.put(entry);
}

export function deleteEntry(id: string): Promise<void> {
  return db.entries.delete(id);
}
