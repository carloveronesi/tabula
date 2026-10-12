import { useEffect, useRef, useState } from "react";
import type { Entry, Location } from "@/data/types";
import { entryMatchesFilter, type SummaryFilter } from "@/domain/monthlyReport";
import { workedMinutes } from "@/domain/time";
import type { WorkHours } from "@/domain/slots";
import { dailyWorkMinutes } from "@/domain/capacity";
import { LOCATION_LABEL, isPresent } from "@/domain/presence";
import {
  isoDate,
  monthGridDates,
  dowMon0,
  isHoliday,
  holidayLabel,
} from "@/domain/calendarNav";
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
  /**
   * Trascinamento su più giorni: crea un'attività che copre l'intervallo.
   * `anchor` è il punto in cui si è rilasciato, per il popover.
   */
  onCreateSpan?: (
    from: Date,
    to: Date,
    anchor: { x: number; y: number },
  ) => void;
  /** Colore di un'attività (per cliente/sottotipo); `null` → accento. */
  colorOf?: (entry: Entry) => string | null;
  /** Giorno del patrono ("MM-GG"): reso come festivo. */
  patronDay?: string;
  /** Filtro di evidenziazione dal riepilogo: i giorni senza match sfumano. */
  highlight?: SummaryFilter | null;
  /**
   * Orario di lavoro: la barra di ogni giorno è in scala sulla giornata piena,
   * così la parte vuota è il tempo non compilato. Senza, la barra è relativa.
   */
  workHours?: WorkHours;
  /** Sede per data: mostra un'icona (remoto/ufficio/cliente) sul giorno. */
  locations?: Record<string, Location>;
  /**
   * Modalità planning presenze: il click su un giorno pianificabile chiama
   * `onCycle` invece di aprirlo, i `suggested` compaiono tratteggiati e il
   * trascinamento è spento.
   */
  planning?: {
    plannable: ReadonlySet<string>;
    suggested: readonly string[];
    onCycle: (dateISO: string) => void;
  } | null;
}

/** Massimo di nomi di attività mostrati in una cella prima del "+N". */
const MAX_NAMES = 3;

/**
 * Vista Mese: griglia 6×7. Le celle fuori dal mese corrente sono marcate
 * (`data-outside`). Ogni giorno con attività mostra una barra segmentata per
 * colore (cliente/sottotipo) in scala sulla giornata piena — il vuoto con la
 * percentuale è il non compilato, anche sui feriali già passati e vuoti — e i nomi delle
 * attività (max `MAX_NAMES` + "+N"); il click apre quel giorno nella vista
 * Giorno. Con un filtro attivo i segmenti/nomi corrispondenti spiccano e gli
 * altri sfumano (i giorni senza match si attenuano del tutto). Trascinando su
 * più celle si seleziona un intervallo e al rilascio parte `onCreateSpan`.
 */
export function MonthGrid({
  date,
  entries = [],
  onOpenDay,
  onCreateSpan,
  colorOf,
  patronDay = "",
  highlight = null,
  locations = {},
  planning = null,
  workHours,
}: MonthGridProps) {
  const fullDay = workHours ? dailyWorkMinutes(workHours) : 0;
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

  // Selezione trascinata: indici in `cells`, dalla cella di partenza a quella
  // sotto al puntatore. `dragged` fa da paraurti al click che segue il rilascio,
  // che altrimenti aprirebbe anche il giorno di partenza.
  const gridRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [sel, setSel] = useState<{ from: number; to: number } | null>(null);
  const lo = sel ? Math.min(sel.from, sel.to) : -1;
  const hi = sel ? Math.max(sel.from, sel.to) : -2;
  const dragging = sel !== null;

  // Rilasciando fuori dalla griglia la selezione non arriva a `onPointerUp`:
  // senza questo resterebbe accesa e appiccicata al puntatore.
  useEffect(() => {
    if (!dragging) return;
    const cancel = () => setSel(null);
    window.addEventListener("pointerup", cancel);
    return () => window.removeEventListener("pointerup", cancel);
  }, [dragging]);

  /** Indice della cella sotto al puntatore (griglia 7×6, gap trascurabile). */
  function cellAt(clientX: number, clientY: number): number | null {
    const r = gridRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return null;
    const col = Math.floor(((clientX - r.left) / r.width) * 7);
    const row = Math.floor(((clientY - r.top) / r.height) * 6);
    if (col < 0 || col > 6 || row < 0 || row > 5) return null;
    return row * 7 + col;
  }

  return (
    <div
      role="grid"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line"
    >
      <div
        role="row"
        className="grid grid-cols-7 border-b border-line bg-surface"
      >
        {DAY_NAMES.map((name, i) => (
          <span
            key={name}
            role="columnheader"
            className={`px-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
              i >= 5 ? "text-muted/70" : "text-muted"
            }`}
          >
            {name}
          </span>
        ))}
      </div>
      <div
        ref={gridRef}
        // `touch-none`: senza, su touch il browser si prende il gesto per lo
        // scroll. La griglia ha altezza fissa e non scrolla, non toglie niente.
        className="grid min-h-0 flex-1 touch-none select-none grid-cols-7 grid-rows-6 gap-px bg-line"
        onPointerDown={(e) => {
          if (!onCreateSpan || planning || e.button !== 0) return;
          const i = cellAt(e.clientX, e.clientY);
          if (i === null) return;
          dragged.current = false;
          setSel({ from: i, to: i });
        }}
        onPointerMove={(e) => {
          if (!sel) return;
          const i = cellAt(e.clientX, e.clientY);
          if (i === null || i === sel.to) return;
          dragged.current = true;
          setSel({ ...sel, to: i });
        }}
        onPointerUp={(e) => {
          if (!sel) return;
          const { from, to } = sel;
          setSel(null);
          // Il click di chiusura arriva subito dopo, e solo se premuta e
          // rilasciata sono la stessa cella. Abbassare il paraurti qui e non nel
          // click: dopo un trascinamento il click non arriva affatto, e resterebbe
          // alzato a mangiarsi il primo Invio da tastiera su una cella.
          setTimeout(() => {
            dragged.current = false;
          }, 0);
          if (from === to) return; // click secco: lo gestisce la cella
          onCreateSpan?.(cells[Math.min(from, to)], cells[Math.max(from, to)], {
            x: e.clientX,
            y: e.clientY,
          });
        }}
        onPointerCancel={() => {
          setSel(null);
          dragged.current = false;
        }}
      >
        {cells.map((d, idx) => {
          const outside = d.getMonth() !== month;
          const weekend = dowMon0(d) >= 5 || isHoliday(d, patronDay);
          const holName = holidayLabel(d, patronDay);
          const today = isoDate(d) === todayKey;
          const dayKey = isoDate(d);
          const dayEntries = byDay.get(dayKey) ?? [];
          const count = dayEntries.length;
          const minsOf = (e: Entry) =>
            workHours ? workedMinutes(e, workHours) : 0;
          const totalMin = dayEntries.reduce((s, e) => s + minsOf(e), 0);
          // Scala: la giornata piena (o il totale, se la supera). Il resto è vuoto.
          const scale = Math.max(fullDay, totalMin);
          const missingPct =
            fullDay > 0
              ? Math.round((Math.max(0, fullDay - totalMin) / fullDay) * 100)
              : 0;
          // Feriali trascorsi del mese: la barra c'è anche vuota, per far vedere il buco.
          const showBar =
            count > 0 ||
            (fullDay > 0 && !outside && !weekend && dayKey < todayKey);
          const dayLoc = locations[dayKey] ?? null;
          // Il filtro per sede è una proprietà del giorno; gli altri delle entry.
          const matches =
            !highlight ||
            (highlight.kind === "location"
              ? dayLoc === highlight.location
              : dayEntries.some((e) => entryMatchesFilter(e, highlight)));
          const dimmed = !!highlight && !matches;
          const suggestedDay =
            !!planning && !outside && planning.suggested.includes(dayKey);
          const plannable =
            !!planning && !outside && planning.plannable.has(dayKey);
          const LocIcon = dayLoc
            ? LOCATION_ICON[dayLoc]
            : suggestedDay
              ? LOCATION_ICON.office
              : null;
          // ponytail: evidenzia ogni cella trascinata, weekend e festivi
          // compresi — qui non arrivano `workingDays`. Quanti giorni riceveranno
          // davvero l'attività lo dice il quick-add ("3 giorni").
          const picked = idx >= lo && idx <= hi;
          return (
            <button
              key={d.toISOString()}
              type="button"
              role="gridcell"
              data-outside={outside}
              data-today={today}
              data-dimmed={dimmed}
              aria-label={
                planning
                  ? `${d.getDate()}: ${dayLoc ? LOCATION_LABEL[dayLoc] : suggestedDay ? "suggerito" : "nessuna sede"}`
                  : count > 0
                    ? `${d.getDate()}: ${count} attività`
                    : undefined
              }
              disabled={!!planning && !plannable}
              data-suggested={suggestedDay || undefined}
              onClick={() => {
                if (dragged.current) return;
                if (planning) planning.onCycle(dayKey);
                else onOpenDay?.(d);
              }}
              className={`tnum group flex min-h-0 flex-col items-start gap-1 overflow-hidden p-2 text-left text-xs transition-[background-color,opacity] duration-[var(--dur-fast)] ease-out hover:bg-raised ${
                picked
                  ? "bg-primary-wash"
                  : weekend
                    ? "bg-weekend"
                    : "bg-surface"
              } ${outside ? "text-faint" : "text-ink"} ${
                picked
                  ? "ring-2 ring-inset ring-primary"
                  : dimmed
                    ? "opacity-40"
                    : matches && highlight
                      ? "ring-1 ring-inset ring-primary/50"
                      : ""
              } ${
                planning
                  ? plannable
                    ? suggestedDay
                      ? "outline-dashed outline-2 -outline-offset-4 outline-primary/60"
                      : isPresent(dayLoc)
                        ? "ring-2 ring-inset ring-primary"
                        : ""
                    : "opacity-50"
                  : ""
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
                    aria-label={
                      dayLoc ? LOCATION_LABEL[dayLoc] : "Ufficio (suggerito)"
                    }
                    title={
                      dayLoc ? LOCATION_LABEL[dayLoc] : "Ufficio (suggerito)"
                    }
                    className={
                      planning && isPresent(dayLoc)
                        ? "text-primary"
                        : suggestedDay && !dayLoc
                          ? "text-primary/60"
                          : "text-muted"
                    }
                  >
                    <LocIcon size={planning ? 16 : 13} />
                  </span>
                )}
              </div>
              {holName && !outside && (
                <span
                  className="w-full truncate text-[11px] font-medium leading-tight text-muted"
                  title={holName}
                >
                  {holName}
                </span>
              )}
              {showBar && (
                <div className="flex w-full flex-col gap-1">
                  <div className="flex w-full items-center gap-1.5">
                    <div className="flex h-1.5 min-w-0 flex-1 gap-px overflow-hidden rounded-pill bg-line">
                      {dayEntries.map((e) => {
                        const color = colorOf?.(e) ?? null;
                        const match =
                          !highlight ||
                          highlight.kind === "location" ||
                          entryMatchesFilter(e, highlight);
                        const width =
                          scale > 0 ? (minsOf(e) / scale) * 100 : 100 / count;
                        return (
                          <span
                            key={e.id}
                            title={e.title}
                            style={{
                              width: `${width}%`,
                              backgroundColor: color ?? undefined,
                            }}
                            className={`h-full ${color ? "" : "bg-primary"} ${
                              match ? "" : "opacity-25"
                            }`}
                          />
                        );
                      })}
                    </div>
                    {/* Sul giorno vuoto la barra vuota basta: "−100%" su
                        ogni feriale scoperto era solo rumore. */}
                    {missingPct > 0 && count > 0 && (
                      <span
                        className="flex-none text-[11px] font-medium leading-none text-muted"
                        title={`${missingPct}% della giornata non compilato`}
                      >
                        −{missingPct}%
                      </span>
                    )}
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
                              color ? "" : "bg-primary"
                            }`}
                          />
                          <span className="truncate text-[11px] leading-tight text-ink/80">
                            {e.title}
                          </span>
                        </li>
                      );
                    })}
                    {count > MAX_NAMES && (
                      <li className="pl-2.5 text-[11px] font-semibold text-muted">
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
