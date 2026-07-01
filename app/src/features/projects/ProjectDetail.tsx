import { useMemo, useState, type ReactNode } from "react";
import type { Entry, Id, Project, ProjectStatus } from "@/data/types";
import type { ProjectStats } from "@/domain/projectStats";
import type { ProjectActivity } from "@/domain/projectActivity";
import { workedMinutes } from "@/domain/time";
import { formatHours } from "@/domain/format";
import { colorFromKey, withAlpha } from "@/domain/colors";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { Button, cn, Icons, Markdown } from "@/ui";
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
  "text-[10px] font-bold uppercase tracking-[0.07em] text-muted";

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
          ? "border-accent bg-primary-wash text-accent"
          : "border-line text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={CARD}>
      <div className={CARD_LABEL}>{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** Pastiglia di stato del progetto, con punto colorato. */
function StatusBadge({ status }: { status: ProjectStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold"
      style={{ background: withAlpha(c, 0.14), color: c }}
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
      style={{ background: withAlpha(c, 0.16), color: c }}
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
  const subtypes = useSettingsStore((s) => s.settings.subtypes);
  const workHours = useSettingsStore((s) => s.settings.workHours);
  const [subtypeFilter, setSubtypeFilter] = useState<Id | null | undefined>(undefined);
  const [timeMode, setTimeMode] = useState<"hours" | "share">("hours");

  const subtypeLabel = (id: Id | null) =>
    id ? (subtypes.find((s) => s.id === id)?.label ?? "Generico") : "Generico";

  // Attività del progetto, più recenti prima; filtrate per sottotipo se scelto
  // (`undefined` = tutti; `null` = "Generico"/senza sottotipo).
  const rows = useMemo(() => {
    const list =
      subtypeFilter === undefined
        ? entries
        : entries.filter((e) => e.subtypeId === subtypeFilter);
    return [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }, [entries, subtypeFilter]);

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
  const estMin = project.estimatedHours * 60;
  const progressPct =
    estMin > 0 ? Math.min(100, Math.round(((stat?.totalMin ?? 0) / estMin) * 100)) : 0;

  const dot = <span className="text-line">·</span>;

  return (
    <section className="max-w-3xl space-y-4">
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

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Ore registrate">
          <span className="tnum text-3xl font-bold leading-none tracking-tight text-ink">
            {formatHours(stat?.totalMin ?? 0)}
          </span>
        </StatCard>
        <StatCard label="Attività">
          <span className="tnum text-3xl font-bold leading-none tracking-tight text-ink">
            {stat?.count ?? 0}
          </span>
        </StatCard>
        <StatCard label="Periodo">
          {stat?.firstDate ? (
            <span className="tnum text-base font-semibold leading-tight text-ink">
              {fmtDay(stat.firstDate)} – {fmtDay(stat.lastDate as string)}
            </span>
          ) : (
            <span className="text-base text-muted">—</span>
          )}
        </StatCard>
      </div>

      {project.estimatedHours > 0 && (
        <div className={CARD}>
          <div className="flex items-baseline justify-between">
            <span className={CARD_LABEL}>Avanzamento</span>
            <span className="text-sm text-muted">
              <span className="tnum font-semibold text-ink">
                {formatHours(stat?.totalMin ?? 0)}
              </span>{" "}
              / {project.estimatedHours}h stimate ·{" "}
              <span className="font-semibold text-accent">{progressPct}%</span>
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-pill bg-raised">
            <div
              className="h-full rounded-pill bg-accent"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

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
                    const pct = b.total > 0 ? (b.minutes / b.total) * 100 : 0;
                    const h = share ? pct : (b.minutes / max) * 100;
                    return (
                      <div key={b.month} className="group relative h-full flex-1">
                        {/* In quota, la traccia piena è il totale del mese; la parte
                            colorata è il progetto, il resto grigio = altri progetti. */}
                        {share && (
                          <div aria-hidden className="absolute inset-0 rounded-sm bg-raised" />
                        )}
                        <div
                          className="absolute inset-x-0 bottom-0 rounded-t-sm"
                          style={{
                            height: `${h}%`,
                            minHeight: b.minutes > 0 ? 2 : 0,
                            background: color,
                          }}
                        >
                          <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-1 text-[10px] font-semibold text-bg opacity-0 shadow-card transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100">
                            {share
                              ? `${Math.round(pct)}% del mese · ${formatHours(b.minutes)}/${formatHours(b.total)}`
                              : formatHours(b.minutes)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {activity.byMonth.map((b) => (
                    <span
                      key={b.month}
                      className="tnum flex-1 text-center text-[10px] leading-none text-muted"
                    >
                      {fmtMonth(b.month)}
                    </span>
                  ))}
                </div>
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

      {(team.length > 0 || refs.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      )}

      {(project.description || project.objectives) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {project.description && (
            <div className={CARD}>
              <div className={CARD_LABEL}>Descrizione</div>
              <Markdown className="mt-2.5 text-sm leading-relaxed text-muted">
                {project.description}
              </Markdown>
            </div>
          )}
          {project.objectives && (
            <div className={CARD}>
              <div className={CARD_LABEL}>Obiettivi</div>
              <Markdown className="mt-2.5 text-sm leading-relaxed text-muted">
                {project.objectives}
              </Markdown>
            </div>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div className={CARD}>
          <div className="flex items-baseline justify-between gap-2">
            <div className={CARD_LABEL}>Elenco attività</div>
            <span className="tnum text-xs text-muted">{rows.length}</span>
          </div>
          {activity && activity.bySubtype.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
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
          <ul className="mt-3">
            {rows.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">
                    {e.title.trim() || "Senza titolo"}
                  </div>
                  <div className="tnum mt-0.5 text-xs text-muted">
                    {fmtDay(e.startsAt.slice(0, 10))}
                    {e.subtypeId !== null && (
                      <span className="text-faint"> · {subtypeLabel(e.subtypeId)}</span>
                    )}
                  </div>
                </div>
                <span className="tnum shrink-0 text-sm font-semibold text-ink">
                  {formatHours(workedMinutes(e, workHours))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
