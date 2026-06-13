/**
 * Repository CRUD tipizzato sopra Dexie.
 * Le query usano l'indice temporale `startsAt`.
 */
import { db } from "@/data/db";
import type { Client, Entry, ISODate, ISODateTime, Project } from "@/data/types";

/** Le entry di un giorno: query sull'indice temporale, non lettura di un contenitore. */
export function entriesOfDay(date: ISODate): Promise<Entry[]> {
  return db.entries
    .where("startsAt")
    .between(`${date}T00:00`, `${date}T23:59`, true, true)
    .toArray();
}

/** Entry il cui inizio cade nell'intervallo [from, to] (estremi inclusi). */
export function entriesInRange(
  from: ISODateTime,
  to: ISODateTime,
): Promise<Entry[]> {
  return db.entries.where("startsAt").between(from, to, true, true).toArray();
}

export function putEntry(entry: Entry): Promise<string> {
  return db.entries.put(entry);
}

export function deleteEntry(id: string): Promise<void> {
  return db.entries.delete(id);
}

/** Tutti i clienti, ordinati per nome (per i selettori). */
export function allClients(): Promise<Client[]> {
  return db.clients.orderBy("name").toArray();
}

/** Tutti i progetti (la cascata filtra per cliente in memoria). */
export function allProjects(): Promise<Project[]> {
  return db.projects.toArray();
}
