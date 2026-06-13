import type { Entry, Id, ISODate } from "@/data/types";
import { durationMinutes } from "@/domain/time";

export interface ProjectStats {
  totalMin: number;
  count: number;
  firstDate: ISODate | null;
  lastDate: ISODate | null;
}

/**
 * Statistiche per progetto da un set di entry (tipicamente tutte): ore totali,
 * numero di attività, primo e ultimo giorno. Una sola passata. Le entry senza
 * `projectId` sono ignorate. Pura.
 */
export function aggregateByProject(entries: Entry[]): Map<Id, ProjectStats> {
  const map = new Map<Id, ProjectStats>();
  for (const e of entries) {
    if (!e.projectId) continue;
    const day = e.startsAt.slice(0, 10);
    const cur =
      map.get(e.projectId) ??
      ({ totalMin: 0, count: 0, firstDate: null, lastDate: null } as ProjectStats);
    cur.totalMin += durationMinutes(e);
    cur.count += 1;
    cur.firstDate = cur.firstDate && cur.firstDate < day ? cur.firstDate : day;
    cur.lastDate = cur.lastDate && cur.lastDate > day ? cur.lastDate : day;
    map.set(e.projectId, cur);
  }
  return map;
}
