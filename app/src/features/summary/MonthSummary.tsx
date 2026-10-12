import { useMemo, type ReactNode } from "react";
import type { EntryType, Id, Location } from "@/data/types";
import {
  monthlyReport,
  type SummaryFilter,
  type SubtypeSlice,
} from "@/domain/monthlyReport";
import { formatHours } from "@/domain/format";
import { colorFromKey } from "@/domain/colors";
import { monthPresence, LOCATIONS, LOCATION_LABEL } from "@/domain/presence";
import { availableMinutes } from "@/domain/capacity";
import { workingDatesOfMonth, isoDate } from "@/domain/calendarNav";
import { cn } from "@/ui/cn";
import { Button } from "@/ui/Button";
import { useUiStore } from "@/store";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { usePresenceStore } from "@/store/presence";
import { useSettingsStore } from "@/store/settings";
import { exportMonthReport } from "./exportReport";

const TYPE_LABEL: Record<EntryType, string> = {
  client: "Cliente",
  internal: "Interno",
  event: "Evento",
  vacation: "Ferie",
};

/** Pastiglia di colore per i tipi non-cliente (decorativa, hex fissi). */
const TYPE_DOT: Record<Exclude<EntryType, "client">, string> = {
  internal: "#94a3b8", // slate
  vacation: "#10b981", // emerald
  event: "#8b5cf6", // violet
};

function sameFilter(a: SummaryFilter | null, b: SummaryFilter | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === "client") return a.clientId === (b as { clientId: Id }).clientId;
  if (a.kind === "type") return a.type === (b as { type: EntryType }).type;
  return a.location === (b as { location: Location }).location;
}

interface MonthSummaryProps {
  activeFilter?: SummaryFilter | null;
  fixedFilter?: SummaryFilter | null;
  onHoverFilter?: (f: SummaryFilter | null) => void;
  onFixFilter?: (f: SummaryFilter | null) => void;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-[0.07em] text-muted">
      {children}
    </div>
  );
}

/** Riga-card filtrabile per un cliente o un tipo, con scomposizione per sottotipo. */
function FilterCard({
  color,
  eyebrow,
  label,
  minutes,
  max,
  subtypes,
  subtypeLabel,
  subtypeColor,
  filter,
  active,
  faded,
  interactive,
  onHover,
  onFix,
}: {
  color: string;
  eyebrow?: string;
  label: string;
  minutes: number;
  max: number;
  subtypes: SubtypeSlice[];
  subtypeLabel: (id: Id | null) => string;
  subtypeColor?: (id: Id | null) => string | null;
  filter: SummaryFilter;
  active: boolean;
  faded: boolean;
  interactive: boolean;
  onHover: (f: SummaryFilter | null) => void;
  onFix: (f: SummaryFilter | null) => void;
}) {
  const detailed =
    subtypes.length > 1 || (subtypes[0] && subtypes[0].subtypeId !== null);
  return (
    <li className={cn("transition-opacity duration-[var(--dur-fast)]", faded && "opacity-40")}>
      <div
        onMouseEnter={interactive ? () => onHover(filter) : undefined}
        onMouseLeave={interactive ? () => onHover(null) : undefined}
        onClick={interactive ? () => onFix(active ? null : filter) : undefined}
        className={cn(
          "flex flex-col rounded-lg border px-3 py-2.5",
          interactive && "cursor-pointer",
          active
            ? "border-primary bg-primary-wash"
            : "border-line bg-raised/40 " + (interactive ? "hover:border-primary/40" : ""),
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 flex-none rounded-[3px]"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
              {eyebrow && (
                <div className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
                  {eyebrow}
                </div>
              )}
              <div className="truncate text-[13px] font-semibold text-ink">{label}</div>
            </div>
          </div>
          <div className="tnum shrink-0 text-[13px] font-semibold text-ink">
            {formatHours(minutes)}
          </div>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-pill bg-line">
          <div
            className="h-full rounded-pill"
            style={{ width: `${max > 0 ? (minutes / max) * 100 : 0}%`, backgroundColor: color }}
          />
        </div>
      </div>
      {detailed && (
        <ul className="ml-4 mt-1.5 space-y-1 border-l border-line pl-2.5">
          {subtypes.map((s) => {
            const c = subtypeColor?.(s.subtypeId) ?? null;
            return (
              <li key={s.subtypeId ?? "_"} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {c && (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 flex-none rounded-pill"
                      style={{ backgroundColor: c }}
                    />
                  )}
                  <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted">
                    {subtypeLabel(s.subtypeId)}
                  </span>
                </div>
                <span className="tnum shrink-0 text-[11px] font-semibold text-ink/80">
                  {formatHours(s.minutes)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/**
 * Pannello di riepilogo del mese attivo: ore totali, copertura della giornata
 * lavorativa, presenze e ripartizione per cliente/tipo con scomposizione per
 * sottotipo. Le righe possono pilotare un filtro di evidenziazione sulla griglia
 * (quando il chiamante passa `onHoverFilter`/`onFixFilter`). Connesso agli store.
 */
export function MonthSummary({
  activeFilter = null,
  fixedFilter = null,
  onHoverFilter,
  onFixFilter,
}: MonthSummaryProps) {
  const entries = useCalendarStore((s) => s.entries);
  const clients = useInventoryStore((s) => s.clients);
  const settings = useSettingsStore((s) => s.settings);
  const metas = usePresenceStore((s) => s.metas);
  const activeDate = useUiStore((s) => s.activeDate);

  const interactive = !!onHoverFilter && !!onFixFilter;
  const onHover = onHoverFilter ?? (() => {});
  const onFix = onFixFilter ?? (() => {});

  const monthKey = isoDate(activeDate).slice(0, 7);

  const todayISO = isoDate(new Date());
  const workingDates = useMemo(
    () => workingDatesOfMonth(activeDate, settings.workingDays, settings.patronDay),
    [activeDate, settings.workingDays, settings.patronDay],
  );
  const monthEntries = useMemo(
    () => entries.filter((e) => e.startsAt.slice(0, 7) === monthKey),
    [entries, monthKey],
  );

  // Copertura sui soli feriali già trascorsi (≤ oggi): il mese corrente non
  // conta i giorni futuri.
  const report = useMemo(
    () =>
      monthlyReport(
        monthEntries,
        workingDates.filter((d) => d <= todayISO),
        settings.workHours,
        settings.slotMinutes,
      ),
    [monthEntries, workingDates, todayISO, settings.workHours, settings.slotMinutes],
  );

  // Presenze sull'intero mese, per pianificare: le ferie intere escono dalla base.
  const presence = useMemo(() => {
    const vacation = new Set(
      workingDates.filter(
        (d) =>
          availableMinutes(
            [d],
            monthEntries.filter((e) => e.startsAt.slice(0, 10) === d),
            settings.workHours,
          ) === 0,
      ),
    );
    return monthPresence(
      workingDates,
      vacation,
      metas,
      settings.presenceTracking.targetPct,
      settings.defaultLocation,
      todayISO,
    );
  }, [
    workingDates,
    monthEntries,
    metas,
    todayISO,
    settings.workHours,
    settings.presenceTracking.targetPct,
    settings.defaultLocation,
  ]);
  const showPresence = settings.presenceTracking.enabled;

  const clientName = (id: Id) => clients.find((c) => c.id === id)?.name ?? "Cliente";
  const clientColor = (id: Id) => settings.clientColors[id] ?? colorFromKey(id);
  const internalColor = (id: Id | null) =>
    id ? settings.internalColors[id] ?? colorFromKey(id) : null;
  const subtypeLabel = (id: Id | null) => {
    if (!id) return "Generico";
    return settings.subtypes.find((s) => s.id === id)?.label ?? "Generico";
  };

  const cov = report.coverage;
  // Barre delle card in scala unica: quota sul tempo totale tracciato nel mese,
  // così Clienti e Altre attività sono confrontabili e la barra = fetta del mese.
  const total = report.totalMin;

  const empty =
    report.totalMin === 0 && !(showPresence && presence.workingDays > 0);

  const sections = (
    <>
      {showPresence && presence.workingDays > 0 && (
        <div>
          <Eyebrow>Presenze</Eyebrow>
          {presence.required > 0 && (
            <>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="tnum text-[32px] font-bold leading-none tracking-tight text-ink">
                  {presence.present}
                  <span className="text-muted">/{presence.required}</span>
                </span>
                <span className="text-[12.5px] text-muted">in presenza</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-line">
                <div
                  className="h-full rounded-pill bg-primary"
                  style={{
                    width: `${Math.min(100, (presence.present / presence.required) * 100)}%`,
                  }}
                />
              </div>
              <div
                className={cn(
                  "mt-1.5 text-xs",
                  presence.missing > presence.open ? "text-danger" : "text-muted",
                )}
              >
                {presence.missing === 0
                  ? "Obiettivo raggiunto"
                  : `Mancano ${presence.missing} · ${presence.open} ${
                      presence.open === 1 ? "giorno libero" : "giorni liberi"
                    }`}
                {presence.planned > 0 && ` · ${presence.planned} pianificati`}
              </div>
            </>
          )}
          <div className="tnum mt-3 text-xs text-muted">
            <span className="font-semibold text-ink">{presence.workingDays}</span> giorni
            lavorativi
            {presence.vacationDays > 0 && ` · ${presence.vacationDays} di ferie`}
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {LOCATIONS.filter((l) => presence.days[l] > 0).map((location) => {
              const days = presence.days[location];
              const filter: SummaryFilter = { kind: "location", location };
              const active = sameFilter(activeFilter, filter);
              const faded = !!fixedFilter && !sameFilter(fixedFilter, filter);
              return (
                <li
                  key={location}
                  className={cn("transition-opacity duration-[var(--dur-fast)]", faded && "opacity-40")}
                >
                  <button
                    type="button"
                    disabled={!interactive}
                    onMouseEnter={interactive ? () => onHover(filter) : undefined}
                    onMouseLeave={interactive ? () => onHover(null) : undefined}
                    onClick={interactive ? () => onFix(active ? null : filter) : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12.5px]",
                      interactive && "cursor-pointer hover:bg-raised",
                      active && "bg-primary-wash",
                    )}
                  >
                    <span className="w-16 shrink-0 text-muted">{LOCATION_LABEL[location]}</span>
                    <div className="relative h-1 flex-1 overflow-hidden rounded-pill bg-line">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-pill",
                          location === "remote" ? "bg-muted/50" : "bg-primary",
                        )}
                        style={{ width: `${(days / presence.baseDays) * 100}%` }}
                      />
                    </div>
                    <span className="tnum w-8 shrink-0 text-right font-semibold text-ink">
                      {days}
                      <span className="text-muted">g</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {presence.open > 0 && (
              <li className="flex items-center gap-2 px-1.5 py-1 text-[12.5px]">
                <span className="flex-1 text-muted">Da decidere</span>
                <span className="tnum w-8 shrink-0 text-right font-semibold text-ink">
                  {presence.open}
                  <span className="text-muted">g</span>
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div>
        <Eyebrow>Ore nel mese</Eyebrow>
        <div className="tnum mt-1.5 text-[40px] font-bold leading-none tracking-tight text-ink">
          {formatHours(report.totalMin)}
        </div>
        <div className="mt-2 text-[12.5px] text-muted">
          {report.activeDays === 0
            ? "Nessuna attività"
            : `su ${report.activeDays} ${report.activeDays === 1 ? "giorno" : "giorni"} · ${formatHours(
                Math.round(report.totalMin / report.activeDays),
              )} in media`}
        </div>
      </div>

      {cov.workingDays > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <Eyebrow>Giorni compilati</Eyebrow>
            <span className="tnum text-[12.5px] font-semibold text-ink">
              {cov.filledDays}
              <span className="text-muted">/{cov.workingDays}</span>
              <span className="ml-1.5 text-muted">{cov.pct}%</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-line">
            <div className="h-full rounded-pill bg-primary" style={{ width: `${cov.pct}%` }} />
          </div>
          <div className="mt-1.5 text-xs text-muted">
            <span className="tnum text-ink/80">{formatHours(cov.registeredMin)}</span> registrate su{" "}
            <span className="tnum text-ink/80">{formatHours(cov.expectedMin)}</span> attese
          </div>
        </div>
      )}

      {report.byClient.length > 0 && (
        <div>
          <Eyebrow>Clienti</Eyebrow>
          <ul className="mt-2 space-y-2">
            {report.byClient.map((c) => {
              const filter: SummaryFilter = { kind: "client", clientId: c.clientId };
              return (
                <FilterCard
                  key={c.clientId}
                  color={clientColor(c.clientId)}
                  label={clientName(c.clientId)}
                  minutes={c.minutes}
                  max={total}
                  subtypes={c.bySubtype}
                  subtypeLabel={subtypeLabel}
                  filter={filter}
                  active={sameFilter(activeFilter, filter)}
                  faded={!!fixedFilter && !sameFilter(fixedFilter, filter)}
                  interactive={interactive}
                  onHover={onHover}
                  onFix={onFix}
                />
              );
            })}
          </ul>
        </div>
      )}

      {report.byOtherType.length > 0 && (
        <div>
          <Eyebrow>Altre attività</Eyebrow>
          <ul className="mt-2 space-y-2">
            {report.byOtherType.map((t) => {
              const filter: SummaryFilter = { kind: "type", type: t.type };
              return (
                <FilterCard
                  key={t.type}
                  color={TYPE_DOT[t.type as Exclude<EntryType, "client">]}
                  label={TYPE_LABEL[t.type]}
                  minutes={t.minutes}
                  max={total}
                  subtypes={t.bySubtype}
                  subtypeLabel={subtypeLabel}
                  subtypeColor={t.type === "internal" ? internalColor : undefined}
                  filter={filter}
                  active={sameFilter(activeFilter, filter)}
                  faded={!!fixedFilter && !sameFilter(fixedFilter, filter)}
                  interactive={interactive}
                  onHover={onHover}
                  onFix={onFix}
                />
              );
            })}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <aside
      className="hidden w-72 flex-none flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:flex"
      onMouseLeave={interactive ? () => onHover(null) : undefined}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-[18px]">
        {empty ? (
          <p className="text-[12.5px] text-muted">Nessuna attività in questo mese.</p>
        ) : (
          sections
        )}
      </div>
      {!empty && (
        <div className="flex-none border-t border-line p-3">
          <Button variant="subtle" size="sm" onClick={exportMonthReport} className="w-full">
            Esporta report
          </Button>
        </div>
      )}
    </aside>
  );
}
