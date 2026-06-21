import { useMemo } from "react";
import type { EntryType } from "@/data/types";
import { summarize } from "@/domain/summary";
import { formatHours } from "@/domain/format";
import { presenceBreakdown, LOCATION_LABEL } from "@/domain/presence";
import { workingDatesOfMonth } from "@/domain/calendarNav";
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

interface Row {
  label: string;
  minutes: number;
}

function Bars({ rows, max, tint }: { rows: Row[]; max: number; tint: string }) {
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li
          key={r.label}
          className="relative flex items-center justify-between overflow-hidden rounded border border-line px-3 py-1.5"
        >
          <span
            aria-hidden
            className={`absolute inset-y-0 left-0 ${tint}`}
            style={{ width: `${max > 0 ? (r.minutes / max) * 100 : 0}%` }}
          />
          <span className="relative truncate text-sm text-ink">{r.label}</span>
          <span className="tnum relative text-sm tabular-nums text-muted">
            {formatHours(r.minutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Riepilogo del mese: ore totali registrate, ripartite per cliente e per tipo.
 * Legge le entry del periodo dal calendar store (caricate da useCalendarData).
 */
export function SummaryView() {
  const entries = useCalendarStore((s) => s.entries);
  const clients = useInventoryStore((s) => s.clients);
  const projects = useInventoryStore((s) => s.projects);
  const activeDate = useUiStore((s) => s.activeDate);
  const presence = useSettingsStore((s) => s.settings.presenceTracking);
  const workingDays = useSettingsStore((s) => s.settings.workingDays);
  const patronDay = useSettingsStore((s) => s.settings.patronDay);
  const metas = usePresenceStore((s) => s.metas);
  const summary = useMemo(() => summarize(entries), [entries]);
  const presenceData = useMemo(
    () =>
      presenceBreakdown(
        workingDatesOfMonth(activeDate, workingDays, patronDay),
        metas,
        presence,
      ),
    [activeDate, workingDays, patronDay, metas, presence],
  );
  const showPresence = presence.enabled;

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Cliente sconosciuto";
  const projectName = (id: string) =>
    projects.find((p) => p.id === id)?.name ?? "Progetto sconosciuto";

  const clientRows: Row[] = summary.byClient.map((c) => ({
    label: clientName(c.clientId),
    minutes: c.minutes,
  }));
  const projectRows: Row[] = summary.byProject.map((p) => ({
    label: projectName(p.projectId),
    minutes: p.minutes,
  }));
  const typeRows: Row[] = summary.byType.map((t) => ({
    label: TYPE_LABEL[t.type],
    minutes: t.minutes,
  }));

  if (summary.totalMin === 0 && !(showPresence && presenceData.workingDays > 0)) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p className="text-sm text-muted">
          Nessuna attività registrata in questo mese.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Totale registrato
        </p>
        <p className="tnum text-4xl font-semibold tracking-tight text-ink">
          {formatHours(summary.totalMin)}
        </p>
        <p className="mt-1 text-sm text-muted">
          su {summary.activeDays}{" "}
          {summary.activeDays === 1 ? "giorno" : "giorni"}
          {summary.activeDays > 0 && (
            <>
              {" · "}
              <span className="tnum tabular-nums">
                {formatHours(Math.round(summary.totalMin / summary.activeDays))}
              </span>{" "}
              in media
            </>
          )}
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Per cliente
        </h3>
        {clientRows.length > 0 ? (
          <Bars
            rows={clientRows}
            max={clientRows[0].minutes}
            tint="bg-accent-wash"
          />
        ) : (
          <p className="text-sm text-muted">Nessuna attività con cliente.</p>
        )}
      </section>

      {projectRows.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Per progetto
          </h3>
          <Bars
            rows={projectRows}
            max={projectRows[0].minutes}
            tint="bg-accent-wash"
          />
        </section>
      )}

      {typeRows.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Per tipo
          </h3>
          <Bars rows={typeRows} max={typeRows[0].minutes} tint="bg-primary-wash" />
        </section>
      )}

      {showPresence && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Presenze
          </h3>
          {presenceData.workingDays === 0 ? (
            <p className="text-sm text-muted">
              Nessun giorno feriale in questo periodo.
            </p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {presenceData.rows.map((r) => (
                  <li
                    key={r.location}
                    className="relative flex items-center justify-between overflow-hidden rounded border border-line px-3 py-1.5"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-accent-wash"
                      style={{ width: `${r.pct}%` }}
                    />
                    <span className="relative truncate text-sm text-ink">
                      {LOCATION_LABEL[r.location]}
                    </span>
                    <span className="relative text-sm text-muted">
                      <span className="tnum tabular-nums">{r.days}g</span>
                      {" · "}
                      <span className="tnum tabular-nums">{r.pct}%</span>
                      {r.targetPct !== null && (
                        <span className="text-faint">
                          {" · obiettivo "}
                          <span className="tnum tabular-nums">
                            {r.targetPct}%
                          </span>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-faint">
                <span className="tnum tabular-nums">{presenceData.tracked}</span>{" "}
                su{" "}
                <span className="tnum tabular-nums">
                  {presenceData.workingDays}
                </span>{" "}
                giorni feriali registrati
                {presenceData.untracked > 0 && (
                  <>
                    {" · "}
                    <span className="tnum tabular-nums">
                      {presenceData.untracked}
                    </span>{" "}
                    non registrati
                  </>
                )}
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
