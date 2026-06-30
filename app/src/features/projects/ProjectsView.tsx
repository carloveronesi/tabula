import { useEffect, useMemo, useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import type { Entry, Id, Project, ProjectStatus } from "@/data/types";
import { aggregateByProject } from "@/domain/projectStats";
import {
  newProject,
  projectEditableEqual,
  type ProjectEditable,
} from "@/domain/projectDraft";
import { formatHours } from "@/domain/format";
import { colorFromKey, withAlpha } from "@/domain/colors";
import { findByName } from "@/domain/dedupeName";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toast";
import {
  Button,
  cn,
  Combobox,
  Field,
  IconButton,
  Icons,
  Input,
  Markdown,
  Textarea,
} from "@/ui";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Attivo",
  completed: "Completato",
  paused: "In pausa",
  archived: "Archiviato",
};
const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];

// Colore della pastiglia di stato (decorativo, hex fissi: non sono ruoli del tema).
const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "#10b981",
  completed: "#3b82f6",
  paused: "#f59e0b",
  archived: "#9aa1b2",
};
// ponytail: i progetti interni non hanno un cliente da cui ereditare il colore;
// ambra fissa per il loro gruppo, come nel mockup.
const INTERNAL_COLOR = "#f59e0b";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const selectClasses =
  "h-9 w-full rounded border border-line bg-bg px-3 text-sm text-ink " +
  "focus:border-primary focus:outline-none";

/** Token selezionato (con rimozione) per team/referenti. */
function Token({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-primary bg-primary-wash",
        "py-1 pl-2.5 pr-1 text-xs text-accent",
      )}
    >
      {label}
      <IconButton label={`Rimuovi ${label}`} size="sm" className="h-5 w-5" onClick={onRemove}>
        <Icons.IconClose size={13} />
      </IconButton>
    </span>
  );
}

const editableOf = (p: Project): ProjectEditable => ({
  name: p.name,
  clientId: p.clientId,
  status: p.status,
  description: p.description,
  objectives: p.objectives,
  estimatedHours: p.estimatedHours,
  startDate: p.startDate,
  endDate: p.endDate,
  teamIds: p.teamIds,
  contactIds: p.contactIds,
  subtaskDefs: p.subtaskDefs,
});

/**
 * Editor inline del progetto selezionato (CRUD): anagrafica, pianificazione
 * (ore stimate, date), **team** (colleghi) e **referenti** (contatti del
 * cliente) modificabili, e **sotto-attività**. Lo stato locale parte dal
 * progetto ed è riavviato dal `key={project.id}` di chi lo monta.
 */
function ProjectEditor({
  project,
  onDeleted,
  onClose,
}: {
  project: Project;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const clients = useInventoryStore((s) => s.clients);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const saveProject = useInventoryStore((s) => s.saveProject);
  const removeProject = useInventoryStore((s) => s.removeProject);
  const savePerson = useInventoryStore((s) => s.savePerson);
  const saveContact = useInventoryStore((s) => s.saveContact);
  const notify = useToastStore((s) => s.notify);

  const [draft, setDraft] = useState<ProjectEditable>(() => editableOf(project));
  const patch = (p: Partial<ProjectEditable>) => setDraft((d) => ({ ...d, ...p }));

  const dirty = !projectEditableEqual(draft, editableOf(project));

  const persist = async (over?: Partial<ProjectEditable>) => {
    const merged = { ...draft, ...over };
    const trimmed = merged.name.trim();
    if (!trimmed) return false;
    const subtaskDefs = merged.subtaskDefs
      .map((s) => ({ ...s, label: s.label.trim() }))
      .filter((s) => s.label);
    const next: ProjectEditable = { ...merged, name: trimmed, subtaskDefs };
    await saveProject({
      ...project,
      ...next,
      kind: next.clientId ? "client" : "internal",
    });
    setDraft(next);
    return true;
  };

  const save = async () => {
    if (await persist()) {
      notify("Progetto salvato");
      onClose();
    }
  };

  const toggleArchive = async () => {
    const status = draft.status === "archived" ? "active" : "archived";
    if (await persist({ status }))
      notify(status === "archived" ? "Progetto archiviato" : "Progetto ripristinato");
  };

  const remove = async () => {
    await removeProject(project.id);
    notify("Progetto eliminato");
    onDeleted();
  };

  // Team (colleghi): tutte le persone; crea al volo le nuove.
  const teamPeople = draft.teamIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const teamAddOptions = people
    .filter((p) => !draft.teamIds.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name }));
  const addTeam = (id: Id) =>
    patch({ teamIds: draft.teamIds.includes(id) ? draft.teamIds : [...draft.teamIds, id] });
  const createPerson = async (name: string) => {
    const existing = findByName(people, name);
    const id = existing?.id ?? nanoid();
    if (!existing) await savePerson({ id, name });
    addTeam(id);
  };

  // Referenti: contatti del cliente del progetto.
  const refContacts = draft.contactIds
    .map((id) => contacts.find((k) => k.id === id))
    .filter((k): k is NonNullable<typeof k> => !!k);
  const contactAddOptions = contacts
    .filter((k) => k.clientId === draft.clientId && !draft.contactIds.includes(k.id))
    .map((k) => ({ id: k.id, label: k.name }));
  const addContact = (id: Id) =>
    patch({ contactIds: draft.contactIds.includes(id) ? draft.contactIds : [...draft.contactIds, id] });
  const createContact = async (name: string) => {
    if (!draft.clientId) return;
    const existing = findByName(
      contacts.filter((k) => k.clientId === draft.clientId),
      name,
    );
    const id = existing?.id ?? nanoid();
    if (!existing) await saveContact({ id, clientId: draft.clientId, name, role: "" });
    addContact(id);
  };

  const addSubtask = () =>
    patch({ subtaskDefs: [...draft.subtaskDefs, { id: nanoid(), label: "" }] });
  const patchSubtask = (id: Id, label: string) =>
    patch({ subtaskDefs: draft.subtaskDefs.map((s) => (s.id === id ? { ...s, label } : s)) });
  const removeSubtask = (id: Id) =>
    patch({ subtaskDefs: draft.subtaskDefs.filter((s) => s.id !== id) });

  return (
    <form
      className="space-y-4 rounded-lg border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field label="Nome">
          <Input
            aria-label="Nome"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>
        <Field label="Stato">
          <select
            aria-label="Stato"
            className={selectClasses}
            value={draft.status}
            onChange={(e) => patch({ status: e.target.value as ProjectStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Cliente">
        <select
          aria-label="Cliente"
          className={selectClasses}
          value={draft.clientId ?? ""}
          // Cambiando cliente i referenti (legati al cliente) non valgono più.
          onChange={(e) => patch({ clientId: e.target.value || null, contactIds: [] })}
        >
          <option value="">Interno (nessun cliente)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
        <Field label="Ore stimate">
          <Input
            type="number"
            min={0}
            step={1}
            aria-label="Ore stimate"
            value={draft.estimatedHours || ""}
            onChange={(e) => patch({ estimatedHours: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Inizio">
          <Input
            type="date"
            aria-label="Inizio"
            value={draft.startDate}
            onChange={(e) => patch({ startDate: e.target.value })}
          />
        </Field>
        <Field label="Fine">
          <Input
            type="date"
            aria-label="Fine"
            value={draft.endDate}
            onChange={(e) => patch({ endDate: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Team">
        <div className="space-y-2">
          {teamPeople.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {teamPeople.map((p) => (
                <Token
                  key={p.id}
                  label={p.name}
                  onRemove={() => patch({ teamIds: draft.teamIds.filter((x) => x !== p.id) })}
                />
              ))}
            </div>
          )}
          <Combobox
            key={`team-${draft.teamIds.length}`}
            label="Aggiungi al team"
            placeholder="Cerca o crea collega…"
            options={teamAddOptions}
            value={null}
            onChange={(id) => addTeam(id)}
            onCreate={(name) => void createPerson(name)}
          />
        </div>
      </Field>

      {draft.clientId && (
        <Field label="Referenti">
          <div className="space-y-2">
            {refContacts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {refContacts.map((k) => (
                  <Token
                    key={k.id}
                    label={k.name}
                    onRemove={() =>
                      patch({ contactIds: draft.contactIds.filter((x) => x !== k.id) })
                    }
                  />
                ))}
              </div>
            )}
            <Combobox
              key={`contact-${draft.contactIds.length}`}
              label="Aggiungi referente"
              placeholder="Cerca o crea referente…"
              options={contactAddOptions}
              value={null}
              onChange={(id) => addContact(id)}
              onCreate={(name) => void createContact(name)}
            />
          </div>
        </Field>
      )}

      <Field label="Sotto-attività">
        <div className="space-y-2">
          {draft.subtaskDefs.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <Input
                aria-label="Sotto-attività"
                value={s.label}
                onChange={(e) => patchSubtask(s.id, e.target.value)}
                placeholder="Es. Analisi, Sviluppo…"
              />
              <IconButton label="Rimuovi sotto-attività" size="sm" onClick={() => removeSubtask(s.id)}>
                <Icons.IconClose size={16} />
              </IconButton>
            </div>
          ))}
          <Button variant="ghost" onClick={addSubtask}>
            <Icons.IconPlus size={16} />
            Aggiungi sotto-attività
          </Button>
        </div>
      </Field>

      <Field label="Descrizione">
        <Textarea
          value={draft.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </Field>
      <Field label="Obiettivi">
        <Textarea
          value={draft.objectives}
          onChange={(e) => patch({ objectives: e.target.value })}
        />
      </Field>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={!dirty || !draft.name.trim()}>
            Salva
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Annulla
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => void toggleArchive()}>
            {draft.status === "archived" ? "Ripristina" : "Archivia"}
          </Button>
          <Button variant="danger" onClick={() => void remove()}>
            Elimina
          </Button>
        </div>
      </div>
    </form>
  );
}

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

const CARD = "rounded-lg border border-line bg-surface p-4 shadow-sm";
const CARD_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.07em] text-muted";

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
  const contacts = useInventoryStore((s) => s.contacts);
  const people = useInventoryStore((s) => s.people);
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
  const sel = selected ? stats.get(selected.id) : undefined;
  const selColor = colorOf(selected?.clientId ?? null);
  const selRefs = selected
    ? selected.contactIds
        .map((id) => contacts.find((k) => k.id === id)?.name)
        .filter((n): n is string => !!n)
    : [];
  const team = selected
    ? selected.teamIds
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p)
    : [];
  const subtasks = selected?.subtaskDefs ?? [];
  const estMin = (selected?.estimatedHours ?? 0) * 60;
  const progressPct =
    estMin > 0 ? Math.min(100, Math.round(((sel?.totalMin ?? 0) / estMin) * 100)) : 0;

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

  const dot = <span className="text-line">·</span>;
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
        <section className="max-w-3xl space-y-4">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">
                  {selected.name}
                </h2>
                <StatusBadge status={selected.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: selColor }}
                  />
                  {selected.clientId
                    ? (clients.find((c) => c.id === selected.clientId)?.name ??
                      "Cliente")
                    : "Progetto interno"}
                </span>
                {selRefs.length > 0 && (
                  <>
                    {dot}
                    <span>
                      Referenti:{" "}
                      <span className="text-ink">{selRefs.join(", ")}</span>
                    </span>
                  </>
                )}
                {(selected.startDate || selected.endDate) && (
                  <>
                    {dot}
                    <span className="tnum">
                      {selected.startDate ? fmtDay(selected.startDate) : "…"} →{" "}
                      {selected.endDate ? fmtDay(selected.endDate) : "…"}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="subtle"
              size="sm"
              className="flex-none"
              onClick={() => setEditing(true)}
            >
              <Icons.IconEdit size={15} />
              Modifica
            </Button>
          </header>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Ore registrate">
              <span className="tnum text-3xl font-bold leading-none tracking-tight text-ink">
                {formatHours(sel?.totalMin ?? 0)}
              </span>
            </StatCard>
            <StatCard label="Attività">
              <span className="tnum text-3xl font-bold leading-none tracking-tight text-ink">
                {sel?.count ?? 0}
              </span>
            </StatCard>
            <StatCard label="Periodo">
              {sel?.firstDate ? (
                <span className="tnum text-base font-semibold leading-tight text-ink">
                  {fmtDay(sel.firstDate)} – {fmtDay(sel.lastDate as string)}
                </span>
              ) : (
                <span className="text-base text-muted">—</span>
              )}
            </StatCard>
          </div>

          {selected.estimatedHours > 0 && (
            <div className={CARD}>
              <div className="flex items-baseline justify-between">
                <span className={CARD_LABEL}>Avanzamento</span>
                <span className="text-sm text-muted">
                  <span className="tnum font-semibold text-ink">
                    {formatHours(sel?.totalMin ?? 0)}
                  </span>{" "}
                  / {selected.estimatedHours}h stimate ·{" "}
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

          {(selected.description || selected.objectives) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {selected.description && (
                <div className={CARD}>
                  <div className={CARD_LABEL}>Descrizione</div>
                  <Markdown className="mt-2.5 text-sm leading-relaxed text-muted">
                    {selected.description}
                  </Markdown>
                </div>
              )}
              {selected.objectives && (
                <div className={CARD}>
                  <div className={CARD_LABEL}>Obiettivi</div>
                  <Markdown className="mt-2.5 text-sm leading-relaxed text-muted">
                    {selected.objectives}
                  </Markdown>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
