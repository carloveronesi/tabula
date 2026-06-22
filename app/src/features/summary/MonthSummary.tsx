import { useMemo, type ReactNode } from "react";
import type { EntryType, Id, Location } from "@/data/types";
import {
  monthlyReport,
  type SummaryFilter,
  type SubtypeSlice,
} from "@/domain/monthlyReport";
import { formatHours } from "@/domain/format";
import { colorFromKey } from "@/domain/colors";
import { presenceBreakdown, LOCATION_LABEL } from "@/domain/presence";
import { workingDatesOfMonth, isoDate } from "@/domain/calendarNav";
import { cn } from "@/ui/cn";
import { useUiStore } from "@/store";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { usePresenceStore } from "@/store/presence";
import { useSettingsStore } from "@/store/settings";

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
  variant?: "sidebar" | "page";
  activeFilter?: SummaryFilter | null;
  fixedFilter?: SummaryFilter | null;
  onHoverFilter?: (f: SummaryFilter | null) => void;
  onFixFilter?: (f: SummaryFilter | null) => void;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-faint">
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
            ? "border-accent bg-primary-wash"
            : "border-line bg-raised/40 " + (interactive ? "hover:border-accent/40" : ""),
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
                <div className="truncate text-[9.5px] font-bold uppercase tracking-wider text-faint">
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
  variant = "sidebar",
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

  const report = useMemo(() => {
    const monthEntries = entries.filter((e) => e.startsAt.slice(0, 7) === monthKey);
    const working = workingDatesOfMonth(activeDate, settings.workingDays, settings.patronDay);
    const todayISO = isoDate(new Date());
    const elapsed = working.filter((d) => d <= todayISO);
    return monthlyReport(monthEntries, elapsed, settings.workHours, settings.slotMinutes);
  }, [entries, monthKey, activeDate, settings.workingDays, settings.patronDay, settings.workHours, settings.slotMinutes]);

  const presence = useMemo(
    () =>
      presenceBreakdown(
        workingDatesOfMonth(activeDate, settings.workingDays, settings.patronDay),
        metas,
        settings.presenceTracking,
        settings.defaultLocation,
      ),
    [
      activeDate,
      settings.workingDays,
      settings.patronDay,
      metas,
      settings.presenceTracking,
      settings.defaultLocation,
    ],
  );
  const showPresence = settings.presenceTracking.enabled;

  const clientName = (id: Id) => clients.find((c) => c.id === id)?.name ?? "Cliente";
  const clientColor = (id: Id) => settings.clientColors[id] ?? colorFromKey(id);
  const internalColor = (id: Id | null) =>
    id ? settings.internalColors[id] ?? colorFromKey(id) : null;
  const subtypeLabel = (kind: "client" | "internal", id: Id | null) => {
    if (!id) return "Generico";
    const list = kind === "client" ? settings.subtypes.client : settings.subtypes.internal;
    return list.find((s) => s.id === id)?.label ?? "Generico";
  };

  const cov = report.coverage;
  const clientMax = report.byClient[0]?.minutes ?? 0;
  const otherMax = report.byOtherType[0]?.minutes ?? 0;

  const empty =
    report.totalMin === 0 && !(showPresence && presence.workingDays > 0);

  const sections = (
    <>
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
              <span className="text-faint">/{cov.workingDays}</span>
              <span className="ml-1.5 text-muted">{cov.pct}%</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-line">
            <div className="h-full rounded-pill bg-accent" style={{ width: `${cov.pct}%` }} />
          </div>
          <div className="mt-1.5 text-[11.5px] text-faint">
            <span className="tnum text-muted">{formatHours(cov.registeredMin)}</span> registrate su{" "}
            <span className="tnum text-muted">{formatHours(cov.expectedMin)}</span> attese
          </div>
        </div>
      )}

      {showPresence && presence.workingDays > 0 && (
        <div>
          <Eyebrow>Presenze</Eyebrow>
          <ul className="mt-2 space-y-1">
            {presence.rows
              .filter((r) => r.days > 0 || r.targetPct !== null)
              .map((r) => {
                const reached = r.targetPct !== null && r.pct >= r.targetPct;
                const filter: SummaryFilter = { kind: "location", location: r.location };
                const active = sameFilter(activeFilter, filter);
                const faded = !!fixedFilter && !sameFilter(fixedFilter, filter);
                return (
                  <li
                    key={r.location}
                    className={cn("transition-opacity duration-[var(--dur-fast)]", faded && "opacity-40")}
                  >
                    <button
                      type="button"
                      disabled={!interactive}
                      onMouseEnter={interactive ? () => onHover(filter) : undefined}
                      onMouseLeave={interactive ? () => onHover(null) : undefined}
                      onClick={interactive ? () => onFix(active ? null : filter) : undefined}
                      className={cn(
                        "flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left text-[12.5px]",
                        interactive && "cursor-pointer hover:bg-raised",
                        active && "bg-primary-wash",
                      )}
                    >
                      <span className="w-14 shrink-0 text-muted">{LOCATION_LABEL[r.location]}</span>
                      <span className="tnum font-semibold text-ink">
                        {r.days}
                        <span className="text-faint">g</span>
                      </span>
                      <div className="relative h-1 flex-1 overflow-hidden rounded-pill bg-line">
                        <div
                          className="absolute inset-y-0 left-0 rounded-pill bg-accent"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                      <span className="tnum shrink-0 text-muted">{r.pct}%</span>
                      {r.targetPct !== null && (
                        <span
                          className={cn(
                            "tnum w-10 shrink-0 text-right text-[11px] font-semibold",
                            reached ? "text-accent" : "text-faint",
                          )}
                        >
                          {reached ? "✓" : `${r.targetPct}%`}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
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
                  max={clientMax}
                  subtypes={c.bySubtype}
                  subtypeLabel={(id) => subtypeLabel("client", id)}
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
                  max={otherMax}
                  subtypes={t.bySubtype}
                  subtypeLabel={(id) => subtypeLabel("internal", id)}
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

  if (variant === "page") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        {empty ? (
          <p className="py-12 text-center text-sm text-muted">
            Nessuna attività registrata in questo mese.
          </p>
        ) : (
          <div className="space-y-7">{sections}</div>
        )}
      </div>
    );
  }

  return (
    <aside
      className="hidden w-72 flex-none flex-col gap-5 overflow-y-auto rounded-xl border border-line bg-surface p-[18px] shadow-card lg:flex"
      onMouseLeave={interactive ? () => onHover(null) : undefined}
    >
      {empty ? (
        <p className="text-[12.5px] text-muted">Nessuna attività in questo mese.</p>
      ) : (
        sections
      )}
    </aside>
  );
}
