import type { Entry } from "@/data/types";
import { entryMatchesFilter, type SummaryFilter } from "@/domain/monthlyReport";
import { isoDate, monthGridDates, dowMon0, isPatronDay } from "@/domain/calendarNav";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

interface MonthGridProps {
  date: Date;
  entries?: Entry[];
  onOpenDay?: (date: Date) => void;
  /** Colore di un'attività (per cliente/sottotipo); `null` → accento. */
  colorOf?: (entry: Entry) => string | null;
  /** Giorno del patrono ("MM-GG"): reso come festivo. */
  patronDay?: string;
  /** Filtro di evidenziazione dal riepilogo: i giorni senza match sfumano. */
  highlight?: SummaryFilter | null;
}

/** Massimo di puntini mostrati in una cella prima del "+N". */
const MAX_DOTS = 5;

/**
 * Vista Mese: griglia 6×7. Le celle fuori dal mese corrente sono marcate
 * (`data-outside`). Ogni giorno con attività mostra un puntino colorato per
 * attività (colore cliente/sottotipo), col titolo nel tooltip; il click apre
 * quel giorno nella vista Giorno.
 */
export function MonthGrid({
  date,
  entries = [],
  onOpenDay,
  colorOf,
  patronDay = "",
  highlight = null,
}: MonthGridProps) {
  const month = date.getMonth();
  const cells = monthGridDates(date);

  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = e.startsAt.slice(0, 10);
    const arr = byDay.get(key);
    if (arr) arr.push(e);
    else byDay.set(key, [e]);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  const todayKey = isoDate(new Date());

  return (
    <div
      role="grid"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line"
    >
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
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-px bg-line">
        {cells.map((d) => {
          const outside = d.getMonth() !== month;
          const weekend = dowMon0(d) >= 5 || isPatronDay(d, patronDay);
          const today = isoDate(d) === todayKey;
          const dayEntries = byDay.get(isoDate(d)) ?? [];
          const count = dayEntries.length;
          const matches =
            !highlight || dayEntries.some((e) => entryMatchesFilter(e, highlight));
          const dimmed = !!highlight && !matches;
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="gridcell"
              data-outside={outside}
              data-today={today}
              data-dimmed={dimmed}
              aria-label={
                count > 0
                  ? `${d.getDate()}: ${count} ${count === 1 ? "attività" : "attività"}`
                  : undefined
              }
              onClick={() => onOpenDay?.(d)}
              className={`tnum group flex min-h-0 flex-col items-start gap-1 overflow-hidden p-2 text-left text-xs transition-[background-color,opacity] duration-[var(--dur-fast)] ease-out hover:bg-raised ${
                weekend ? "bg-weekend" : "bg-surface"
              } ${outside ? "text-faint" : "text-ink"} ${
                dimmed ? "opacity-40" : matches && highlight ? "ring-1 ring-inset ring-accent/50" : ""
              }`}
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
                <span className="mt-auto flex flex-wrap items-center gap-1">
                  {dayEntries.slice(0, MAX_DOTS).map((e) => {
                    const color = colorOf?.(e) ?? null;
                    return (
                      <span
                        key={e.id}
                        title={e.title}
                        style={{ backgroundColor: color ?? undefined }}
                        className={`h-1.5 w-1.5 rounded-pill ${color ? "" : "bg-accent"}`}
                      />
                    );
                  })}
                  {count > MAX_DOTS && (
                    <span className="text-[10px] font-semibold text-muted">
                      +{count - MAX_DOTS}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
