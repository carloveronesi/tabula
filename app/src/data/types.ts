/**
 * Modello dati dell'app.
 * Entry = record con range temporale assoluto; entità referenziate per id opaco.
 */

export type Id = string; // opaco (nanoid)
export type ISODateTime = string; // "2026-06-12T09:00:00"
export type ISODate = string; // "2026-06-12"

export type EntryType = "client" | "internal" | "vacation" | "event";

export interface Entry {
  id: Id;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  type: EntryType;
  projectId: Id | null;
  clientId: Id | null; // ridondante per query veloci; deriva da projectId
  subtypeId: Id | null;
  title: string;
  collaboratorIds: Id[];
  contactIds: Id[];
  notes: string; // markdown
  blockers: string; // problemi/blocchi incontrati
  nextSteps: string;
  links: { label: string; url: string }[];
  milestone: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Client {
  id: Id;
  name: string;
  color: string | null; // assegnato da palette e persistito (no hash a runtime)
  createdAt: number;
}

export type ProjectStatus = "active" | "completed" | "paused" | "archived";

export interface Project {
  id: Id;
  clientId: Id | null; // null ⇒ progetto interno
  kind: "client" | "internal";
  name: string;
  status: ProjectStatus;
  description: string;
  objectives: string;
  startDate: ISODate | "";
  endDate: ISODate | "";
  teamIds: Id[];
  contactIds: Id[];
  estimatedHours: number;
  color: string | null; // colore del progetto; null ⇒ fallback deterministico
}

export interface Person {
  id: Id;
  name: string;
}

export interface Contact {
  id: Id;
  clientId: Id;
  name: string;
  role: string;
  email?: string;
  office?: string;
}

export interface Recurrence {
  id: Id;
  rrule: string; // RRULE iCal (rrule.js)
  template: Omit<
    Entry,
    "id" | "startsAt" | "endsAt" | "createdAt" | "updatedAt"
  >;
  startTimeMin: number;
  endTimeMin: number;
  until: ISODate | null;
}

/**
 * Timer "in corso": un solo record (`id: "active"`) col momento di avvio.
 * Allo stop diventa una Entry; finché gira non sporca il calendario.
 */
export interface RunningTimer {
  id: "active";
  startedAt: number; // epoch ms
}

export interface Todo {
  id: Id;
  title: string;
  projectId: Id | null; // collegato al progetto
  tags: string[];
  done: boolean;
  dueDate: ISODate | null;
  subtasks: { id: Id; title: string; done: boolean }[];
  createdAt: number;
}

/** Attività salvata da reinserire rapidamente (senza fascia oraria). */
export interface ActivityTemplate {
  id: Id;
  name: string; // etichetta del chip
  title: string;
  type: EntryType;
  clientId: Id | null;
  projectId: Id | null;
  subtypeId: Id | null;
  createdAt: number;
}

export type Location = "remote" | "office" | "client";

export interface DayMeta {
  date: ISODate;
  location: Location | null;
}

export interface Settings {
  id: "app";
  theme: "light" | "dark" | "system";
  defaultView: "day" | "week" | "month" | "projects" | "todo";
  defaultLocation: Location;
  workHours: {
    morningStart: number;
    morningEnd: number;
    afternoonStart: number;
    afternoonEnd: number;
  };
  workingDays: number[]; // 0=Lun..6=Dom
  slotMinutes: 15 | 30;
  subtypes: { id: Id; label: string }[]; // lista unica, condivisa da cliente e interno
  clientColors: Record<Id, string>;
  internalColors: Record<Id, string>;
  lastUsedByClient: Record<
    Id,
    { subtypeId: Id | null; milestone: string | null }
  >;
  patronDay: string; // "MM-GG"
  presenceTracking: {
    enabled: boolean;
    officeTargetPct: number;
    clientTargetPct: number;
  };
}
