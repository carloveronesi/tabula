import type { ViewMode } from "@/domain/view";
import type { ISODate, ISODateTime } from "@/data/types";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Data locale → "YYYY-MM-DD" (nessuna conversione di fuso). */
export function isoDate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

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

/** Estremo iniziale/finale di un giorno come ISODateTime locale. */
function dayStart(date: Date): ISODateTime {
  return `${isoDate(date)}T00:00:00`;
}
function dayEnd(date: Date): ISODateTime {
  return `${isoDate(date)}T23:59:59`;
}

/**
 * Intervallo temporale [from, to] (estremi inclusi) coperto da una vista per la
 * data focale. È il range che la vista deve caricare dal DB: day = il giorno;
 * week = lun–dom della settimana; month = l'intera griglia 6×7. projects/todo
 * non hanno asse temporale: range inerte sul giorno corrente.
 */
export function viewRange(
  date: Date,
  view: ViewMode,
): { from: ISODateTime; to: ISODateTime } {
  switch (view) {
    case "week": {
      const monday = addDays(date, -dowMon0(date));
      return { from: dayStart(monday), to: dayEnd(addDays(monday, 6)) };
    }
    case "month": {
      const cells = monthGridDates(date);
      return { from: dayStart(cells[0]), to: dayEnd(cells[cells.length - 1]) };
    }
    default:
      return { from: dayStart(date), to: dayEnd(date) };
  }
}
