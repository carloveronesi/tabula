import type { Entry, EntryType } from "@/data/types";

export interface SearchOpts {
  query?: string;
  type?: EntryType | null;
}

const haystack = (e: Entry) =>
  `${e.title}\n${e.notes}\n${e.blockers}\n${e.nextSteps}`.toLowerCase();

/**
 * Ricerca testuale sulle entry: match case-insensitive su titolo, note,
 * problemi e prossimi passi, con filtro opzionale per tipo. Risultati ordinati
 * per data decrescente. Senza query né tipo restituisce nulla. Pura.
 */
export function searchEntries(entries: Entry[], opts: SearchOpts): Entry[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  const type = opts.type ?? null;
  if (!q && !type) return [];

  return entries
    .filter((e) => (type ? e.type === type : true))
    .filter((e) => (q ? haystack(e).includes(q) : true))
    .sort((a, b) => (a.startsAt < b.startsAt ? 1 : a.startsAt > b.startsAt ? -1 : 0));
}
