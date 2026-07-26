import { useMemo, useState, type ReactNode } from "react";
import type { Entry, Id, Project, ProjectStatus } from "@/data/types";
import type { ProjectStats } from "@/domain/projectStats";
import type { ProjectActivity } from "@/domain/projectActivity";
import { workedMinutes } from "@/domain/time";
import { formatHours } from "@/domain/format";
import { budgetProgress } from "@/domain/budget";
import { colorFromKey, tint } from "@/domain/colors";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useEditorStore } from "@/store/editor";
import { Button, cn, Icons, Markdown } from "@/ui";
import { ProjectSummaryCard } from "./ProjectSummaryCard";
import { STATUS_COLOR, STATUS_LABEL } from "./meta";

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

/** "YYYY-MM" → "giu" / "gen '27" (anno solo a gennaio, per orientarsi). */
function fmtMonth(m: string): string {
  const [y, mo] = m.split("-");
  const short = new Intl.DateTimeFormat("it-IT", { month: "short" }).format(
    new Date(Number(y), Number(mo) - 1, 1),
  );
  return mo === "01" ? `${short} '${y.slice(2)}` : short;
}

const CARD = "rounded-lg border border-line bg-surface p-4 shadow-sm";
const CARD_LABEL =
  "text-[11px] font-bold uppercase tracking-[0.07em] text-muted";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** Chip di filtro attivabile (usato per filtrare l'elenco attività per sottotipo). */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-[var(--dur-fast)]",
        active
          ? "border-primary bg-primary-wash text-primary"
          : "border-line text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Riga della card "Numeri": etichetta a sinistra, valore a destra. */
function NumberRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tnum text-right text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** Pastiglia di stato del progetto, con punto colorato. */
function StatusBadge({ status }: { status: ProjectStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold"
      style={{ background: tint(c, 0.14), color: c }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Avatar con iniziali, tinto in modo deterministico sull'id della persona. */
function Avatar({ id, name }: { id: string; name: string }) {
  const c = colorFromKey(id);
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-xs font-semibold"
      style={{ background: tint(c, 0.16), color: c }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Pannello di dettaglio (sola lettura) del progetto selezionato: anagrafica,
 * statistiche aggregate, avanzamento sulle ore stimate, team, referenti e
 * testi (descrizione/obiettivi). `clientName` è `null` per i progetti interni.
 */
export function ProjectDetail({
  project,
  stat,
  activity,
  entries,
  color,
  clientName,
  onEdit,
}: {
  project: Project;
  stat: ProjectStats | undefined;
  activity: ProjectActivity | null;
  entries: Entry[];
  color: string;
  clientName: string | null;
  onEdit: () => void;
}) {
  const contacts = useInventoryStore((s) => s.contacts);
  const people = useInventoryStore((s) => s.people);
  const showDetail = useEditorStore((s) => s.showDetail);
  const subtypes = useSettingsStore((s) => s.settings.subtypes);
  const workHours = useSettingsStore((s) => s.settings.workHours);
  const [subtypeFilter, setSubtypeFilter] = useState<Id | null | undefined>(undefined);
  const [timeMode, setTimeMode] = useState<"hours" | "share">("hours");
  const [activityQuery, setActivityQuery] = useState("");

  const subtypeLabel = (id: Id | null) =>
    id ? (subtypes.find((s) => s.id === id)?.label ?? "Generico") : "Generico";

  // Attività del progetto, più recenti prima; filtrate per sottotipo (`undefined`
  // = tutti; `null` = "Generico"/senza sottotipo) e per testo del titolo.
  const rows = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    const list = entries.filter(
      (e) =>
        (subtypeFilter === undefined || e.subtypeId === subtypeFilter) &&
        (!q || e.title.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }, [entries, subtypeFilter, activityQuery]);

  // Referenti espliciti del progetto; se non ce ne sono, ripiega sui contatti
  // del cliente (nei dati reali il link progetto→referente non è quasi mai
  // popolato, ma il cliente ha i suoi contatti). `fromClient` marca il fallback.
  const explicitRefs = project.contactIds
    .map((id) => contacts.find((k) => k.id === id))
    .filter((k): k is NonNullable<typeof k> => !!k);
  const clientRefs = project.clientId
    ? contacts.filter((k) => k.clientId === project.clientId)
    : [];
  const refs = explicitRefs.length > 0 ? explicitRefs : clientRefs;
  const refsFromClient = explicitRefs.length === 0 && clientRefs.length > 0;
  const team = project.teamIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const loggedMin = stat?.totalMin ?? 0;
  const { pct: realPct, overBudget, overMin } = budgetProgress(
    loggedMin,
    project.estimatedHours,
  );

  const dot = <span className="text-line">·</span>;

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {project.name}
            </h2>
            <StatusBadge status={project.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: color }}
              />
              {clientName ?? "Progetto interno"}
            </span>
            {(project.startDate || project.endDate) && (
              <>
                {dot}
                <span className="tnum">
                  {project.startDate ? fmtDay(project.startDate) : "…"} →{" "}
                  {project.endDate ? fmtDay(project.endDate) : "…"}
                </span>
              </>
            )}
          </div>
        </div>
        <Button variant="subtle" size="sm" className="flex-none" onClick={onEdit}>
          <Icons.IconEdit size={15} />
          Modifica
        </Button>
      </header>

      {/* L'occhiello del progetto: testo nudo sotto il titolo, non card. È quello
          che hai scritto tu e non cambia; le card sotto sono quelle che cambiano. */}
      {(project.description || project.objectives) && (
        <div className="max-w-3xl space-y-3">
          {project.description && (
            <Markdown className="text-sm leading-relaxed text-muted">
              {project.description}
            </Markdown>
          )}
          {project.objectives && (
            <div>
              <div className={CARD_LABEL}>Obiettivi</div>
              <Markdown className="mt-1.5 text-sm leading-relaxed text-muted">
                {project.objectives}
              </Markdown>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="space-y-4 lg:col-span-2">
      {/* `key`: cambiando progetto la card si rimonta e la chiamata in volo
          viene annullata, così il riassunto non finisce sul progetto sbagliato. */}
      <ProjectSummaryCard
        key={project.id}
        project={project}
        stat={stat}
        activity={activity}
        entries={entries}
        clientName={clientName}
        className={CARD}
      />

      {activity && activity.byMonth.length > 0 && (
        <div className={CARD}>
          <div className="flex items-center justify-between gap-2">
            <div className={CARD_LABEL}>Attività nel tempo</div>
            <div className="flex gap-1.5">
              <FilterChip active={timeMode === "hours"} onClick={() => setTimeMode("hours")}>
                Ore
              </FilterChip>
              <FilterChip active={timeMode === "share"} onClick={() => setTimeMode("share")}>
                Quota mese
              </FilterChip>
            </div>
          </div>
          {(() => {
            const share = timeMode === "share";
            const max = Math.max(...activity.byMonth.map((b) => b.minutes), 1);
            return (
              <div className="mt-4">
                <div className="flex h-24 items-end gap-1.5">
                  {activity.byMonth.map((b) => {
                    // Quota: la traccia piena è la capacità del mese; dal basso
                    // progetto (colore) · altro lavoro (grigio) · resto scoperto =
                    // tempo non compilato (la traccia che resta a vista).
                    const denom = b.capacity > 0 ? b.capacity : b.total;
                    const projPct =
                      denom > 0 ? Math.min(100, (b.minutes / denom) * 100) : 0;
                    const otherPct =
                      denom > 0
                        ? Math.min(
                            100 - projPct,
                            (Math.max(0, b.total - b.minutes) / denom) * 100,
                          )
                        : 0;
                    const gapMin = Math.max(0, denom - b.total);
                    const hoursH = (b.minutes / max) * 100;
                    return (
                      <div key={b.month} className="group relative h-full flex-1">
                        {share ? (
                          <>
                            <div aria-hidden className="absolute inset-0 rounded-sm bg-raised" />
                            <div className="absolute inset-0 flex flex-col-reverse overflow-hidden rounded-sm">
                              <div
                                style={{
                                  height: `${projPct}%`,
                                  minHeight: b.minutes > 0 ? 2 : 0,
                                  background: color,
                                }}
                              />
                              <div className="bg-ink/15" style={{ height: `${otherPct}%` }} />
                            </div>
                          </>
                        ) : (
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-t-sm"
                            style={{
                              height: `${hoursH}%`,
                              minHeight: b.minutes > 0 ? 2 : 0,
                              background: color,
                            }}
                          />
                        )}
                        <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-1 text-[11px] font-semibold text-bg opacity-0 shadow-card transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100">
                          {share
                            ? `${Math.round(projPct)}% · ${formatHours(b.minutes)} su ${formatHours(denom)}${gapMin > 0 ? ` · ${formatHours(gapMin)} da compilare` : ""}`
                            : formatHours(b.minutes)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {activity.byMonth.map((b) => (
                    <span
                      key={b.month}
                      className="tnum flex-1 text-center text-[11px] leading-none text-muted"
                    >
                      {fmtMonth(b.month)}
                    </span>
                  ))}
                </div>
                {share && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
                      Progetto
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-ink/15" />
                      Altro lavoro
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-raised" />
                      Non compilato
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {activity && activity.bySubtype.length > 1 && (
        <div className={CARD}>
          <div className={CARD_LABEL}>Ore per sottotipo</div>
          <ul className="mt-3 space-y-2">
            {activity.bySubtype.map((s) => (
              <li key={s.subtypeId ?? "_"}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-ink">{subtypeLabel(s.subtypeId)}</span>
                  <span className="tnum shrink-0 font-semibold text-ink">
                    {formatHours(s.minutes)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-pill bg-raised">
                  <div
                    className="h-full rounded-pill"
                    style={{
                      width: `${(s.minutes / activity.bySubtype[0].minutes) * 100}%`,
                      background: color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

        </div>

        <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
      <div className={CARD}>
        <div className={CARD_LABEL}>Numeri</div>
        <dl className="mt-3 space-y-2">
          <NumberRow label="Ore registrate" value={formatHours(loggedMin)} />
          <NumberRow label="Attività" value={stat?.count ?? 0} />
          <NumberRow
            label="Periodo"
            value={
              stat?.firstDate ? (
                <span className="text-xs">
                  {fmtDay(stat.firstDate)} – {fmtDay(stat.lastDate as string)}
                </span>
              ) : (
                "—"
              )
            }
          />
        </dl>
        {project.estimatedHours > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted">
                su {project.estimatedHours}h stimate
              </span>
              <span
                className={cn(
                  "tnum font-semibold",
                  overBudget ? "text-danger" : "text-primary",
                )}
              >
                {realPct}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-pill bg-raised">
              <div
                className={cn("h-full rounded-pill", overBudget ? "bg-danger" : "bg-primary")}
                style={{ width: `${Math.min(100, realPct)}%` }}
              />
            </div>
            {overBudget && (
              <div className="mt-2 text-xs font-medium text-danger">
                {formatHours(overMin)} oltre la stima
              </div>
            )}
          </div>
        )}
      </div>
      {team.length > 0 && (
        <div className={CARD}>
          <div className={CARD_LABEL}>Team</div>
          <div className="mt-3 flex max-h-56 flex-col gap-2.5 overflow-y-auto">
            {team.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <Avatar id={p.id} name={p.name} />
                <span className="text-sm text-ink">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {refs.length > 0 && (
        <div className={CARD}>
          <div className={CARD_LABEL}>
            Referenti{refsFromClient && " del cliente"}
          </div>
          <div className="mt-3 flex max-h-56 flex-col gap-2.5 overflow-y-auto">
            {refs.map((k) => (
              <div key={k.id} className="flex items-center gap-2.5">
                <Avatar id={k.id} name={k.name} />
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{k.name}</div>
                  {k.role && (
                    <div className="truncate text-xs text-muted">{k.role}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </aside>
      </div>

      {entries.length > 0 && (
        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className={CARD_LABEL}>Elenco attività</span>
              <span className="tnum text-xs text-muted">{rows.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {activity && activity.bySubtype.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip
                    active={subtypeFilter === undefined}
                    onClick={() => setSubtypeFilter(undefined)}
                  >
                    Tutti
                  </FilterChip>
                  {activity.bySubtype.map((s) => (
                    <FilterChip
                      key={s.subtypeId ?? "_"}
                      active={subtypeFilter === s.subtypeId}
                      onClick={() => setSubtypeFilter(s.subtypeId)}
                    >
                      {subtypeLabel(s.subtypeId)}
                    </FilterChip>
                  ))}
                </div>
              )}
              {entries.length > 8 && (
                <label className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-bg px-3 focus-within:border-primary sm:w-64">
                  <Icons.IconSearch size={15} className="shrink-0 text-muted" />
                  <input
                    type="search"
                    aria-label="Cerca attività"
                    placeholder="Cerca attività…"
                    value={activityQuery}
                    onChange={(e) => setActivityQuery(e.target.value)}
                    className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                  />
                </label>
              )}
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nessuna attività trovata.</p>
          ) : (
            <ul className="mt-3 max-h-[32rem] overflow-y-auto">
              {rows.map((e) => (
                <li key={e.id} className="border-b border-line last:border-0">
                  {/* Una riga sola: a tutta larghezza il titolo non ha bisogno di
                      andare a capo, e data e ore si leggono in colonna. */}
                  <button
                    type="button"
                    onClick={() => showDetail(e)}
                    className="flex w-full items-baseline gap-3 rounded-md px-2 py-2 text-left transition-colors duration-[var(--dur-fast)] hover:bg-raised"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {e.title.trim() || "Senza titolo"}
                    </span>
                    {e.subtypeId !== null && (
                      <span className="hidden shrink-0 text-xs text-muted sm:inline">
                        {subtypeLabel(e.subtypeId)}
                      </span>
                    )}
                    <span className="tnum w-28 shrink-0 text-right text-xs text-muted">
                      {fmtDay(e.startsAt.slice(0, 10))}
                    </span>
                    <span className="tnum w-16 shrink-0 text-right text-sm font-semibold text-ink">
                      {formatHours(workedMinutes(e, workHours))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
