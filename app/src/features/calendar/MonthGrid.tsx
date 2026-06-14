import type { Entry } from "@/data/types";
import { isoDate, monthGridDates, dowMon0 } from "@/domain/calendarNav";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

interface MonthGridProps {
  date: Date;
  entries?: Entry[];
  onOpenDay?: (date: Date) => void;
}

/**
 * Vista Mese: griglia 6×7. Le celle fuori dal mese corrente sono marcate
 * (`data-outside`). Ogni giorno con attività mostra il conteggio; il click
 * apre quel giorno nella vista Giorno.
 */
export function MonthGrid({ date, entries = [], onOpenDay }: MonthGridProps) {
  const month = date.getMonth();
  const cells = monthGridDates(date);

  const countByDay = new Map<string, number>();
  for (const e of entries) {
    const key = e.startsAt.slice(0, 10);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const todayKey = isoDate(new Date());

  return (
    <div role="grid" className="overflow-hidden rounded-lg border border-line">
      <div role="row" className="grid grid-cols-7 border-b border-line bg-surface">
        {DAY_NAMES.map((name, i) => (
          <span
            key={name}
            role="columnheader"
            className={`px-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
              i >= 5 ? "text-faint" : "text-muted"
            }`}
          >
            {name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-line">
        {cells.map((d) => {
          const outside = d.getMonth() !== month;
          const weekend = dowMon0(d) >= 5;
          const today = isoDate(d) === todayKey;
          const count = countByDay.get(isoDate(d)) ?? 0;
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="gridcell"
              data-outside={outside}
              data-today={today}
              onClick={() => onOpenDay?.(d)}
              className={`tnum group flex min-h-24 flex-col items-start gap-1 p-2 text-left text-xs transition-colors duration-[var(--dur-fast)] ease-out hover:bg-raised ${
                weekend ? "bg-weekend" : "bg-surface"
              } ${outside ? "text-faint" : "text-ink"}`}
            >
              <span
                className={
                  today
                    ? "grid h-6 w-6 place-items-center rounded-pill bg-primary font-semibold text-primary-ink shadow-sm"
                    : "grid h-6 w-6 place-items-center font-medium"
                }
              >
                {d.getDate()}
              </span>
              {count > 0 && (
                <span className="mt-auto inline-flex items-center gap-1 rounded-pill bg-primary-wash px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {count} {count === 1 ? "voce" : "voci"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
