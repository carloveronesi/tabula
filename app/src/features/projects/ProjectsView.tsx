import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type { Entry, Id, Project } from "@/data/types";
import { aggregateByProject } from "@/domain/projectStats";
import { projectActivity } from "@/domain/projectActivity";
import { newProject } from "@/domain/projectDraft";
import { formatHours } from "@/domain/format";
import { colorFromKey } from "@/domain/colors";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { Button, cn, Icons } from "@/ui";
import { INTERNAL_COLOR } from "./meta";
import { ProjectEditor } from "./ProjectEditor";
import { ProjectDetail } from "./ProjectDetail";

function ProjectItem({
  project,
  totalMin,
  active,
  color,
  onSelect,
}: {
  project: Project;
  totalMin: number;
  active: boolean;
  color: string;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm",
          "transition-colors duration-[var(--dur-fast)] ease-out",
          active ? "bg-raised shadow-sm" : "hover:bg-raised",
        )}
      >
        {active && (
          <span
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
            style={{ background: color }}
          />
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            active ? "font-semibold text-ink" : "text-ink",
          )}
        >
          {project.name}
        </span>
        <span
          className={cn(
            "tnum shrink-0 text-xs",
            active ? "font-medium text-accent" : "text-muted",
          )}
        >
          {formatHours(totalMin)}
        </span>
      </button>
    </li>
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
  const clientColors = useSettingsStore((s) => s.settings.clientColors);
  const workHours = useSettingsStore((s) => s.settings.workHours);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void allEntries().then(setEntries);
  }, []);

  const stats = useMemo(() => aggregateByProject(entries, workHours), [entries, workHours]);

  const colorOf = (clientId: Id | null) =>
    clientId ? (clientColors[clientId] ?? colorFromKey(clientId)) : INTERNAL_COLOR;

  const matches = (p: Project) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase());

  const archived = useMemo(
    () =>
      projects
        .filter((p) => p.status === "archived")
        .sort((a, b) => a.name.localeCompare(b.name, "it")),
    [projects],
  );

  const groups = useMemo(() => {
    const sorted = [...projects]
      .filter((p) => p.status !== "archived")
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
    const byClient = new Map<string, Project[]>();
    for (const p of sorted) {
      const key = p.clientId ?? "__internal";
      const list = byClient.get(key) ?? [];
      list.push(p);
      byClient.set(key, list);
    }
    const out: { label: string; color: string; projects: Project[] }[] = [];
    for (const c of [...clients].sort((a, b) => a.name.localeCompare(b.name, "it"))) {
      const ps = byClient.get(c.id);
      if (ps) out.push({ label: c.name, color: colorOf(c.id), projects: ps });
    }
    const internal = byClient.get("__internal");
    if (internal)
      out.push({ label: "Interni", color: INTERNAL_COLOR, projects: internal });
    return out;
    // colorOf è stabile rispetto a clientColors, già fra le dipendenze.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, clients, clientColors]);

  const visibleGroups = query.trim()
    ? groups
        .map((g) => ({ ...g, projects: g.projects.filter(matches) }))
        .filter((g) => g.projects.length > 0)
    : groups;
  const visibleArchived = query.trim() ? archived.filter(matches) : archived;

  const firstId = groups[0]?.projects[0]?.id ?? null;
  useEffect(() => {
    if (!selectedId && firstId) setSelectedId(firstId);
  }, [selectedId, firstId]);

  const saveProject = useInventoryStore((s) => s.saveProject);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const selClientName = selected?.clientId
    ? (clients.find((c) => c.id === selected.clientId)?.name ?? "Cliente")
    : null;

  const activity = useMemo(
    () => (selected ? projectActivity(entries, selected.id, workHours) : null),
    [entries, selected, workHours],
  );

  const select = (id: string) => {
    setSelectedId(id);
    setEditing(false);
  };

  const createProject = async () => {
    const p = newProject({ name: "Nuovo progetto", clientId: null }, nanoid());
    await saveProject(p);
    setSelectedId(p.id);
    setEditing(true);
  };

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <p className="text-sm text-muted">
          Nessun progetto. Crea il primo o importa i dati dalle Impostazioni.
        </p>
        <Button variant="primary" onClick={() => void createProject()}>
          Nuovo progetto
        </Button>
      </div>
    );
  }

  const activeCount = projects.filter((p) => p.status !== "archived").length;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="flex w-72 flex-none flex-col border-r border-line bg-surface">
        <div className="px-3 pt-4">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-lg font-bold tracking-tight text-ink">Progetti</h2>
            <span className="tnum text-xs text-muted">{activeCount} attivi</span>
          </div>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-bg px-3 focus-within:border-primary">
            <Icons.IconSearch size={15} className="shrink-0 text-muted" />
            <input
              type="search"
              aria-label="Cerca progetto"
              placeholder="Cerca progetto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
          </label>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        {visibleGroups.map((g) => (
          <div key={g.label}>
            <div className="mb-1.5 flex items-center gap-2 px-2">
              <span
                className="h-2 w-2 flex-none rounded-sm"
                style={{ background: g.color }}
              />
              <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-muted">
                {g.label}
              </h3>
            </div>
            <ul className="space-y-0.5">
              {g.projects.map((p) => (
                <ProjectItem
                  key={p.id}
                  project={p}
                  totalMin={stats.get(p.id)?.totalMin ?? 0}
                  active={p.id === selectedId}
                  color={g.color}
                  onSelect={() => select(p.id)}
                />
              ))}
            </ul>
          </div>
        ))}

        {visibleArchived.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-1.5 px-2 text-xs font-bold uppercase tracking-[0.05em] text-muted hover:text-ink"
            >
              {showArchived ? (
                <Icons.IconChevronDown size={13} />
              ) : (
                <Icons.IconChevronRight size={13} />
              )}
              {showArchived ? "Nascondi" : "Mostra"} archiviati ({visibleArchived.length})
            </button>
            {showArchived && (
              <ul className="mt-1 space-y-0.5">
                {visibleArchived.map((p) => (
                  <ProjectItem
                    key={p.id}
                    project={p}
                    totalMin={stats.get(p.id)?.totalMin ?? 0}
                    active={p.id === selectedId}
                    color={colorOf(p.clientId)}
                    onSelect={() => select(p.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
        </div>

        <div className="border-t border-line p-3">
          <Button
            variant="subtle"
            size="sm"
            className="w-full"
            onClick={() => void createProject()}
          >
            <Icons.IconPlus size={16} />
            Nuovo progetto
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto bg-bg px-6 py-6">
      {selected && editing && (
        <div className="max-w-3xl">
          <ProjectEditor
            key={selected.id}
            project={selected}
            onDeleted={() => {
              setEditing(false);
              setSelectedId(null);
            }}
            onClose={() => setEditing(false)}
          />
        </div>
      )}

      {selected && !editing && (
        <ProjectDetail
          project={selected}
          stat={stats.get(selected.id)}
          activity={activity}
          color={colorOf(selected.clientId)}
          clientName={selClientName}
          onEdit={() => setEditing(true)}
        />
      )}
      </div>
    </div>
  );
}
