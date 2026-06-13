import type { Entry } from "@/data/types";
import { isoDate, monthGridDates } from "@/domain/calendarNav";

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

  return (
    <div role="grid">
      <div role="row" className="grid grid-cols-7">
        {DAY_NAMES.map((name) => (
          <span
            key={name}
            role="columnheader"
            className="px-2 py-1 text-xs font-semibold text-muted"
          >
            {name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const outside = d.getMonth() !== month;
          const count = countByDay.get(isoDate(d)) ?? 0;
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="gridcell"
              data-outside={outside}
              onClick={() => onOpenDay?.(d)}
              className={`tnum flex min-h-20 flex-col items-start border border-line p-1.5 text-left text-xs transition-colors duration-[var(--dur-fast)] ease-out hover:bg-raised ${
                outside ? "text-faint" : "text-ink"
              }`}
            >
              <span>{d.getDate()}</span>
              {count > 0 && (
                <span className="mt-auto inline-flex items-center gap-1 rounded-pill bg-primary-wash px-1.5 py-0.5 text-[10px] font-medium text-ink">
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
