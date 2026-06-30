import { type ReactNode } from "react";
import type { Project, ProjectStatus } from "@/data/types";
import type { ProjectStats } from "@/domain/projectStats";
import { formatHours } from "@/domain/format";
import { colorFromKey, withAlpha } from "@/domain/colors";
import { useInventoryStore } from "@/store/inventory";
import { Button, Icons, Markdown } from "@/ui";
import { STATUS_COLOR, STATUS_LABEL } from "./meta";

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

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
 * statistiche aggregate, avanzamento sulle ore stimate, team, sotto-attività e
 * testi (descrizione/obiettivi). `clientName` è `null` per i progetti interni.
 */
export function ProjectDetail({
  project,
  stat,
  color,
  clientName,
  onEdit,
}: {
  project: Project;
  stat: ProjectStats | undefined;
  color: string;
  clientName: string | null;
  onEdit: () => void;
}) {
  const contacts = useInventoryStore((s) => s.contacts);
  const people = useInventoryStore((s) => s.people);

  const refs = project.contactIds
    .map((id) => contacts.find((k) => k.id === id)?.name)
    .filter((n): n is string => !!n);
  const team = project.teamIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const subtasks = project.subtaskDefs;
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
            {refs.length > 0 && (
              <>
                {dot}
                <span>
                  Referenti: <span className="text-ink">{refs.join(", ")}</span>
                </span>
              </>
            )}
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

      {(team.length > 0 || subtasks.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {team.length > 0 && (
            <div className={CARD}>
              <div className={CARD_LABEL}>Team</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {team.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <Avatar id={p.id} name={p.name} />
                    <span className="text-sm text-ink">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {subtasks.length > 0 && (
            <div className={CARD}>
              <div className={CARD_LABEL}>Sotto-attività</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {subtasks.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-md bg-primary-wash px-3 py-1 text-xs font-medium text-accent"
                  >
                    {s.label}
                  </span>
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
    </section>
  );
}
