import Dexie, { type Table } from "dexie";
import type {
  ActivityTemplate,
  Client,
  Contact,
  DayMeta,
  Entry,
  Person,
  Project,
  Recurrence,
  RunningTimer,
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
  timer!: Table<RunningTimer, string>;
  templates!: Table<ActivityTemplate, string>;

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
    // v2: timer "in corso" persistito (sopravvive a reload e chiusura PWA).
    this.version(2).stores({ timer: "id" });
    // v3: template di attività riutilizzabili dalla creazione rapida.
    this.version(3).stores({ templates: "id" });
  }
}

export const db = new AppDB();
