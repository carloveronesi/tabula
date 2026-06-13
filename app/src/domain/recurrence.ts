import { rrulestr } from "rrule";

/**
 * True se la ricorrenza (stringa RRULE, con DTSTART) ha un'occorrenza
 * nel giorno indicato. Il confronto è fatto in UTC per evitare ambiguità
 * di fuso: l'intervallo è [00:00:00, 23:59:59] UTC della data.
 */
export function occursOn(rule: string, date: Date): boolean {
  const parsed = rrulestr(rule);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59));
  return parsed.between(start, end, true).length > 0;
}
