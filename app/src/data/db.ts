import Dexie, { type Table } from "dexie";
import type {
  Client,
  Contact,
  DayMeta,
  Entry,
  Person,
  Project,
  Recurrence,
  Settings,
  Todo,
} from "@/data/types";

/**
 * Storage primario: IndexedDB (Dexie), record per-entry indicizzati.
 */
export class AppDB extends Dexie {
  entries!: Table<Entry, string>;
  clients!: Table<Client, string>;
  projects!: Table<Project, string>;
  people!: Table<Person, string>;
  contacts!: Table<Contact, string>;
  recurrences!: Table<Recurrence, string>;
  todos!: Table<Todo, string>;
  days!: Table<DayMeta, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("tabula");
    this.version(1).stores({
      entries: "id, startsAt, [projectId+startsAt], clientId, type",
      clients: "id, name",
      projects: "id, clientId, status",
      people: "id, name",
      contacts: "id, clientId",
      recurrences: "id",
      todos: "id, projectId, done",
      days: "date",
      settings: "id",
    });
  }
}

export const db = new AppDB();
