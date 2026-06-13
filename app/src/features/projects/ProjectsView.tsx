import { useEffect, useMemo, useState } from "react";
import type { Entry, Project, ProjectStatus } from "@/data/types";
import { aggregateByProject } from "@/domain/projectStats";
import { formatHours } from "@/domain/format";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Attivo",
  completed: "Completato",
  paused: "In pausa",
  archived: "Archiviato",
};

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="tnum mt-0.5 text-lg text-ink">{value}</dd>
    </div>
  );
}

/**
 * Vista Progetti: elenco per cliente con statistiche aggregate (ore, attività,
 * periodo) e pannello di dettaglio. Le stats coprono l'intero archivio, quindi
 * la vista carica tutte le entry, non solo quelle del periodo.
 */
export function ProjectsView() {
  const clients = useInventoryStore((s) => s.clients);
  const projects = useInventoryStore((s) => s.projects);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void allEntries().then(setEntries);
  }, []);

  const stats = useMemo(() => aggregateByProject(entries), [entries]);

  const groups = useMemo(() => {
    const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name, "it"));
    const byClient = new Map<string, Project[]>();
    for (const p of sorted) {
      const key = p.clientId ?? "__internal";
      const list = byClient.get(key) ?? [];
      list.push(p);
      byClient.set(key, list);
    }
    const out: { label: string; projects: Project[] }[] = [];
    for (const c of [...clients].sort((a, b) => a.name.localeCompare(b.name, "it"))) {
      const ps = byClient.get(c.id);
      if (ps) out.push({ label: c.name, projects: ps });
    }
    const internal = byClient.get("__internal");
    if (internal) out.push({ label: "Interni", projects: internal });
    return out;
  }, [projects, clients]);

  const firstId = groups[0]?.projects[0]?.id ?? null;
  useEffect(() => {
    if (!selectedId && firstId) setSelectedId(firstId);
  }, [selectedId, firstId]);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const sel = selected ? stats.get(selected.id) : undefined;

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <p className="text-sm text-muted">
          Nessun progetto. Importa i dati dalle Impostazioni.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
      <aside className="space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {g.label}
            </h3>
            <ul className="space-y-0.5">
              {g.projects.map((p) => {
                const st = stats.get(p.id);
                const active = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      aria-pressed={active}
                      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors duration-[var(--dur-fast)] ease-out ${
                        active ? "bg-raised text-ink" : "text-ink hover:bg-raised"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="tnum shrink-0 text-xs text-muted">
                        {formatHours(st?.totalMin ?? 0)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>

      {selected && (
        <section className="space-y-6">
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                {selected.name}
              </h2>
              <span className="rounded-pill bg-raised px-2 py-0.5 text-xs text-muted">
                {STATUS_LABEL[selected.status]}
              </span>
            </div>
            <p className="text-sm text-muted">
              {selected.clientId
                ? (clients.find((c) => c.id === selected.clientId)?.name ??
                  "Cliente")
                : "Progetto interno"}
            </p>
          </header>

          <dl className="grid grid-cols-3 gap-4 rounded-lg border border-line bg-surface p-4">
            <Stat label="Ore" value={formatHours(sel?.totalMin ?? 0)} />
            <Stat label="Attività" value={String(sel?.count ?? 0)} />
            <Stat
              label="Periodo"
              value={
                sel?.firstDate
                  ? `${fmtDay(sel.firstDate)} – ${fmtDay(sel.lastDate as string)}`
                  : "—"
              }
            />
          </dl>

          {selected.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Descrizione
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {selected.description}
              </p>
            </div>
          )}
          {selected.objectives && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Obiettivi
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {selected.objectives}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
