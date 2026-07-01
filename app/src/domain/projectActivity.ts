import type { Entry, Id } from "@/data/types";
import { workedMinutes } from "@/domain/time";
import type { WorkHours } from "@/domain/slots";

export interface MonthBucket {
  /** "YYYY-MM". */
  month: string;
  minutes: number;
}

export interface SubtypeBucket {
  subtypeId: Id | null;
  minutes: number;
}

export interface ProjectActivity {
  /** Ore per mese dal primo all'ultimo mese con attività, buchi inclusi (0). */
  byMonth: MonthBucket[];
  /** Ore per sottotipo, decrescente. */
  bySubtype: SubtypeBucket[];
}

/** "YYYY-MM" + 1 mese. */
function nextMonth(m: string): string {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7));
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}

/**
 * Attività di un singolo progetto per il pannello di dettaglio: distribuzione
 * temporale (per mese) e ripartizione per sottotipo. Le entry di altri progetti
 * sono ignorate; i buchi fra primo e ultimo mese sono riempiti a 0 così la
 * timeline mostra anche i periodi fermi. Pura.
 */
export function projectActivity(
  entries: Entry[],
  projectId: Id,
  wh: WorkHours,
): ProjectActivity {
  const months = new Map<string, number>();
  const subtypes = new Map<Id | null, number>();
  for (const e of entries) {
    if (e.projectId !== projectId) continue;
    const min = workedMinutes(e, wh);
    const month = e.startsAt.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + min);
    subtypes.set(e.subtypeId, (subtypes.get(e.subtypeId) ?? 0) + min);
  }

  const byMonth: MonthBucket[] = [];
  const keys = [...months.keys()].sort();
  if (keys.length > 0) {
    for (let m = keys[0]; m <= keys[keys.length - 1]; m = nextMonth(m)) {
      byMonth.push({ month: m, minutes: months.get(m) ?? 0 });
    }
  }

  const bySubtype = [...subtypes.entries()]
    .map(([subtypeId, minutes]) => ({ subtypeId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  return { byMonth, bySubtype };
}
