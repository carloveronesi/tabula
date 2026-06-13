import type { ViewMode } from "@/domain/view";

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Aggiunge mesi facendo clamp al massimo giorno valido del mese risultante. */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** Giorno della settimana con lunedì = 0 … domenica = 6. */
export function dowMon0(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Sposta la data focale in base alla vista; projects/todo non si spostano. */
export function shiftFocus(date: Date, view: ViewMode, dir: -1 | 1): Date {
  switch (view) {
    case "day":
      return addDays(date, dir);
    case "week":
      return addDays(date, 7 * dir);
    case "month":
      return addMonths(date, dir);
    default:
      return new Date(date);
  }
}

/** Date dei giorni lavorativi nella settimana (lun-based) contenente `date`. */
export function workWeekDays(date: Date, workingDays: number[]): Date[] {
  const monday = addDays(date, -dowMon0(date));
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    if (workingDays.includes(i)) out.push(addDays(monday, i));
  }
  return out;
}

/** 42 date (6×7, lun-based) per la griglia mensile contenente il mese di `date`. */
export function monthGridDates(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = addDays(first, -dowMon0(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
