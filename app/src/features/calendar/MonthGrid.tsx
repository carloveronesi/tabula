import type { Entry, Location } from "@/data/types";
import { entryMatchesFilter, type SummaryFilter } from "@/domain/monthlyReport";
import { durationMinutes } from "@/domain/time";
import { LOCATION_LABEL } from "@/domain/presence";
import { isoDate, monthGridDates, dowMon0, isPatronDay } from "@/domain/calendarNav";
import { IconHome, IconBuilding, IconBriefcase } from "@/ui/icons";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const LOCATION_ICON: Record<Location, typeof IconHome> = {
  remote: IconHome,
  office: IconBuilding,
  client: IconBriefcase,
};

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
  /** Sede per data: mostra un'icona (remoto/ufficio/cliente) sul giorno. */
  locations?: Record<string, Location>;
}

/** Massimo di nomi di attività mostrati in una cella prima del "+N". */
const MAX_NAMES = 3;

/**
 * Vista Mese: griglia 6×7. Le celle fuori dal mese corrente sono marcate
 * (`data-outside`). Ogni giorno con attività mostra una barra segmentata per
 * colore (cliente/sottotipo), larga in proporzione alle ore, e i nomi delle
 * attività (max `MAX_NAMES` + "+N"); il click apre quel giorno nella vista
 * Giorno. Con un filtro attivo i segmenti/nomi corrispondenti spiccano e gli
 * altri sfumano (i giorni senza match si attenuano del tutto).
 */
export function MonthGrid({
  date,
  entries = [],
  onOpenDay,
  colorOf,
  patronDay = "",
  highlight = null,
  locations = {},
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
          const dayKey = isoDate(d);
          const dayEntries = byDay.get(dayKey) ?? [];
          const count = dayEntries.length;
          const totalMin = dayEntries.reduce((s, e) => s + durationMinutes(e), 0);
          const dayLoc = locations[dayKey] ?? null;
          // Il filtro per sede è una proprietà del giorno; gli altri delle entry.
          const matches =
            !highlight ||
            (highlight.kind === "location"
              ? dayLoc === highlight.location
              : dayEntries.some((e) => entryMatchesFilter(e, highlight)));
          const dimmed = !!highlight && !matches;
          const LocIcon = dayLoc ? LOCATION_ICON[dayLoc] : null;
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
              <div className="flex w-full items-center justify-between">
                <span
                  className={
                    today
                      ? "grid h-6 w-6 place-items-center rounded-pill bg-primary font-semibold text-primary-ink shadow-sm"
                      : "grid h-6 w-6 place-items-center font-medium"
                  }
                >
                  {d.getDate()}
                </span>
                {LocIcon && !outside && (
                  <span
                    aria-label={LOCATION_LABEL[dayLoc!]}
                    title={LOCATION_LABEL[dayLoc!]}
                    className="text-muted"
                  >
                    <LocIcon size={13} />
                  </span>
                )}
              </div>
              {count > 0 && (
                <div className="mt-auto flex w-full flex-col gap-1">
                  <div className="flex h-1 w-full gap-px overflow-hidden rounded-pill">
                    {dayEntries.map((e) => {
                      const color = colorOf?.(e) ?? null;
                      const match =
                        !highlight ||
                        highlight.kind === "location" ||
                        entryMatchesFilter(e, highlight);
                      const width =
                        totalMin > 0
                          ? (durationMinutes(e) / totalMin) * 100
                          : 100 / count;
                      return (
                        <span
                          key={e.id}
                          title={e.title}
                          style={{ width: `${width}%`, backgroundColor: color ?? undefined }}
                          className={`h-full ${color ? "" : "bg-accent"} ${
                            match ? "" : "opacity-25"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <ul className="flex w-full flex-col gap-px">
                    {dayEntries.slice(0, MAX_NAMES).map((e) => {
                      const color = colorOf?.(e) ?? null;
                      const match =
                        !highlight ||
                        highlight.kind === "location" ||
                        entryMatchesFilter(e, highlight);
                      return (
                        <li
                          key={e.id}
                          className={`flex items-center gap-1 ${match ? "" : "opacity-40"}`}
                        >
                          <span
                            aria-hidden
                            style={{ backgroundColor: color ?? undefined }}
                            className={`h-1.5 w-1.5 flex-none rounded-[2px] ${
                              color ? "" : "bg-accent"
                            }`}
                          />
                          <span className="truncate text-[10px] leading-tight text-ink/80">
                            {e.title}
                          </span>
                        </li>
                      );
                    })}
                    {count > MAX_NAMES && (
                      <li className="pl-2.5 text-[9px] font-semibold text-muted">
                        +{count - MAX_NAMES}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
