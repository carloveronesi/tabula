/**
 * Repository CRUD tipizzato sopra Dexie.
 * Le query usano l'indice temporale `startsAt`.
 */
import { db } from "@/data/db";
import { remapIds } from "@/domain/refs";
import type {
  ActivityTemplate,
  Client,
  Contact,
  DayMeta,
  Entry,
  ISODate,
  ISODateTime,
  Person,
  Project,
  RunningTimer,
  Todo,
} from "@/data/types";

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

/** Tutte le entry (per le aggregazioni che attraversano l'intero archivio). */
export function allEntries(): Promise<Entry[]> {
  return db.entries.toArray();
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

export function putClient(client: Client): Promise<string> {
  return db.clients.put(client);
}

export function putPerson(person: Person): Promise<string> {
  return db.people.put(person);
}

export function putContact(contact: Contact): Promise<string> {
  return db.contacts.put(contact);
}

/**
 * Riassegna i riferimenti a una persona prima di eliminarne il record:
 * `to` = id (unione in un'altra persona) oppure `null` (eliminazione). Tocca
 * `entry.collaboratorIds` e `project.teamIds`; riscrive solo i record cambiati.
 */
export async function repointPerson(
  from: string,
  to: string | null,
): Promise<void> {
  await db.transaction("rw", db.entries, db.projects, db.people, async () => {
    for (const e of await db.entries.toArray()) {
      const next = remapIds(e.collaboratorIds, from, to);
      if (next !== e.collaboratorIds)
        await db.entries.put({ ...e, collaboratorIds: next });
    }
    for (const p of await db.projects.toArray()) {
      const next = remapIds(p.teamIds, from, to);
      if (next !== p.teamIds) await db.projects.put({ ...p, teamIds: next });
    }
    await db.people.delete(from);
  });
}

/** Come `repointPerson` ma per i contatti: `entry.contactIds`, `project.contactIds`. */
export async function repointContact(
  from: string,
  to: string | null,
): Promise<void> {
  await db.transaction("rw", db.entries, db.projects, db.contacts, async () => {
    for (const e of await db.entries.toArray()) {
      const next = remapIds(e.contactIds, from, to);
      if (next !== e.contactIds)
        await db.entries.put({ ...e, contactIds: next });
    }
    for (const p of await db.projects.toArray()) {
      const next = remapIds(p.contactIds, from, to);
      if (next !== p.contactIds)
        await db.projects.put({ ...p, contactIds: next });
    }
    await db.contacts.delete(from);
  });
}

/** Tutti i progetti (la cascata filtra per cliente in memoria). */
export function allProjects(): Promise<Project[]> {
  return db.projects.toArray();
}

export function putProject(project: Project): Promise<string> {
  return db.projects.put(project);
}

export function deleteProject(id: string): Promise<void> {
  return db.projects.delete(id);
}

/** Tutte le persone (collaboratori), ordinate per nome. */
export function allPeople(): Promise<Person[]> {
  return db.people.orderBy("name").toArray();
}

/** Tutti i contatti (referenti); la UI filtra per cliente in memoria. */
export function allContacts(): Promise<Contact[]> {
  return db.contacts.toArray();
}

/** Tutti i todo (la vista ordina/filtra in memoria). */
export function allTodos(): Promise<Todo[]> {
  return db.todos.toArray();
}

export function putTodo(todo: Todo): Promise<string> {
  return db.todos.put(todo);
}

export function deleteTodo(id: string): Promise<void> {
  return db.todos.delete(id);
}

/** Metadati-giornata (sede) il cui `date` cade in [from, to] (estremi inclusi). */
export function dayMetasInRange(
  from: ISODate,
  to: ISODate,
): Promise<DayMeta[]> {
  return db.days.where("date").between(from, to, true, true).toArray();
}

export function putDayMeta(meta: DayMeta): Promise<string> {
  return db.days.put(meta);
}

export function deleteDayMeta(date: ISODate): Promise<void> {
  return db.days.delete(date);
}

/** Tutti i template di attività. */
export function allTemplates(): Promise<ActivityTemplate[]> {
  return db.templates.toArray();
}

export function putTemplate(t: ActivityTemplate): Promise<string> {
  return db.templates.put(t);
}

export function deleteTemplate(id: string): Promise<void> {
  return db.templates.delete(id);
}

/** Timer "in corso" persistito (record singolo `id: "active"`), o `undefined`. */
export function getTimer(): Promise<RunningTimer | undefined> {
  return db.timer.get("active");
}

export function putTimer(timer: RunningTimer): Promise<string> {
  return db.timer.put(timer);
}

export function clearTimer(): Promise<void> {
  return db.timer.delete("active");
}
