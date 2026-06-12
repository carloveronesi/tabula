/**
 * Forma del formato di import (file JSON di export). Solo struttura.
 * Usata dall'importer per interpretare i dati in ingresso.
 */

export type SourceEntryType = "client" | "internal" | "vacation" | "event";

export interface SourceEntry {
  type: SourceEntryType;
  subtypeId: string | null;
  projectId?: string | null;
  title: string;
  client: string;
  collaborators: string[];
  clientContacts: string[];
  notes: string;
  wentWrong: string;
  nextSteps: string;
  links: { label: string; url: string }[];
  milestone: string | null;
}

/** hours: mappa "HH:MM" → Entry, con una copia per ogni slot occupato. */
export interface SourceDay {
  AM: SourceEntry | null;
  PM: SourceEntry | null;
  location: "remote" | "office" | "client" | null;
  hours?: Record<string, SourceEntry>;
}

export interface SourceClient {
  name: string;
}

/** Progetto nel formato di import (keyed da id `prj_…`); forma variabile client/internal. */
export interface SourceProject {
  id: string;
  name: string;
  kind: "client" | "internal";
  clientKey: string | null;
  subtypeId?: string;
  cliente?: string;
  description?: string;
  objectives?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  team?: string[];
  clientContacts?: string[];
}

export interface SourcePerson {
  name: string;
  taskTypes?: string[];
}

/** Todo nel formato di import (group/startDate/endDate). */
export interface SourceTodo {
  id: string;
  title: string;
  description?: string;
  group?: string;
  startDate?: string | null;
  endDate?: string | null;
  isDone: boolean;
  subtasks?: unknown[];
  tags?: string[];
  project?: string;
  createdAt: number;
}

/** Settings nel formato di import: forma tollerante (campi opzionali). */
export type SourceSettings = Record<string, unknown>;
