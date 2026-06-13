import type { ViewMode } from "@/domain/view";
import { addDays, dowMon0 } from "@/domain/calendarNav";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Minuti → durata leggibile: "0h", "45m", "2h", "1h 30m". */
export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return "0h";
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const fmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("it-IT", opts).format(date);

/**
 * Etichetta del periodo mostrato, in italiano. Pensata per l'intestazione serif
 * della barra: "Venerdì 13 giugno 2026", "Giugno 2026", "8–14 giugno 2026".
 * projects/todo non hanno periodo → stringa vuota.
 */
export function formatPeriod(date: Date, view: ViewMode): string {
  switch (view) {
    case "day":
      return cap(
        fmt(date, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );

    case "month":
      return cap(fmt(date, { month: "long", year: "numeric" }));

    case "riepilogo":
      return `Riepilogo · ${cap(fmt(date, { month: "long", year: "numeric" }))}`;

    case "week": {
      const monday = addDays(date, -dowMon0(date));
      const sunday = addDays(monday, 6);
      const year = sunday.getFullYear();
      if (monday.getMonth() === sunday.getMonth()) {
        const month = fmt(monday, { month: "long" });
        return `${monday.getDate()}–${sunday.getDate()} ${month} ${year}`;
      }
      const a = `${monday.getDate()} ${fmt(monday, { month: "short" }).replace(".", "")}`;
      const b = `${sunday.getDate()} ${fmt(sunday, { month: "short" }).replace(".", "")}`;
      return `${a} – ${b} ${year}`;
    }

    default:
      return "";
  }
}
