import type { Entry, EntryType, Id, ISODate } from "@/data/types";

export interface SearchOpts {
  query?: string;
  type?: EntryType | null;
  clientId?: Id | null;
  projectId?: Id | null;
  from?: ISODate | null; // giorno di inizio ≥ from (incluso)
  to?: ISODate | null; // giorno di inizio ≤ to (incluso)
}

const haystack = (e: Entry) =>
  `${e.title}\n${e.notes}\n${e.blockers}\n${e.nextSteps}`.toLowerCase();

/** Porzione data ("YYYY-MM-DD") dall'istante di inizio. */
const dayOf = (e: Entry): ISODate => e.startsAt.slice(0, 10);

/**
 * Ricerca sulle entry: testo (titolo/note/problemi/prossimi passi, case-insensitive)
 * più filtri opzionali per tipo, cliente, progetto e intervallo di date (sul
 * giorno di inizio, estremi inclusi). Risultati per data decrescente. Senza
 * alcun filtro restituisce nulla. Pura.
 */
export function searchEntries(entries: Entry[], opts: SearchOpts): Entry[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  const type = opts.type ?? null;
  const clientId = opts.clientId ?? null;
  const projectId = opts.projectId ?? null;
  const from = opts.from ?? null;
  const to = opts.to ?? null;

  const hasFilter = !!(q || type || clientId || projectId || from || to);
  if (!hasFilter) return [];

  return entries
    .filter((e) => (type ? e.type === type : true))
    .filter((e) => (clientId ? e.clientId === clientId : true))
    .filter((e) => (projectId ? e.projectId === projectId : true))
    .filter((e) => (from ? dayOf(e) >= from : true))
    .filter((e) => (to ? dayOf(e) <= to : true))
    .filter((e) => (q ? haystack(e).includes(q) : true))
    .sort((a, b) => (a.startsAt < b.startsAt ? 1 : a.startsAt > b.startsAt ? -1 : 0));
}
