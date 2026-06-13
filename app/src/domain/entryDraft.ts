import type { Entry, EntryType, Id, ISODate } from "@/data/types";
import { dateTimeAt } from "@/domain/time";
import { minutesOfDay } from "@/domain/slots";

/** Stato modificabile dell'editor: il sottoinsieme di Entry che si edita a mano. */
export interface EntryDraft {
  title: string;
  date: ISODate;
  startMin: number;
  endMin: number;
  type: EntryType;
  clientId: Id | null;
  projectId: Id | null;
  subtypeId: Id | null;
  notes: string;
}

/** Bozza vuota per una nuova entry in un giorno/fascia. */
export function emptyDraft(
  date: ISODate,
  startMin: number,
  endMin: number,
): EntryDraft {
  return {
    title: "",
    date,
    startMin,
    endMin,
    type: "client",
    clientId: null,
    projectId: null,
    subtypeId: null,
    notes: "",
  };
}

/** Bozza pre-compilata da una entry esistente (modifica). */
export function draftFromEntry(e: Entry): EntryDraft {
  return {
    title: e.title,
    date: e.startsAt.slice(0, 10),
    startMin: minutesOfDay(e.startsAt),
    endMin: minutesOfDay(e.endsAt),
    type: e.type,
    clientId: e.clientId,
    projectId: e.projectId,
    subtypeId: e.subtypeId,
    notes: e.notes,
  };
}

/** Una bozza è salvabile se ha un titolo e una fine successiva all'inizio. */
export function isDraftValid(d: EntryDraft): boolean {
  return d.title.trim() !== "" && d.endMin > d.startMin;
}

/**
 * Costruisce/aggiorna una Entry dalla bozza. `id`/`now` iniettati per restare
 * pura e testabile; con `base` (modifica) conserva id, createdAt e i campi non
 * gestiti dall'editor, altrimenti li inizializza vuoti.
 */
export function applyDraft(
  d: EntryDraft,
  ctx: { id: string; now: number; base?: Entry },
): Entry {
  const base = ctx.base;
  return {
    id: base?.id ?? ctx.id,
    startsAt: dateTimeAt(d.date, d.startMin),
    endsAt: dateTimeAt(d.date, d.endMin),
    type: d.type,
    projectId: d.projectId,
    clientId: d.clientId,
    subtypeId: d.subtypeId,
    title: d.title.trim(),
    collaboratorIds: base?.collaboratorIds ?? [],
    contactIds: base?.contactIds ?? [],
    notes: d.notes,
    blockers: base?.blockers ?? "",
    nextSteps: base?.nextSteps ?? "",
    links: base?.links ?? [],
    milestone: base?.milestone ?? null,
    createdAt: base?.createdAt ?? ctx.now,
    updatedAt: ctx.now,
  };
}
