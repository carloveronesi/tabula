import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type { Entry, Id, Project, ProjectStatus } from "@/data/types";
import { aggregateByProject } from "@/domain/projectStats";
import {
  newProject,
  projectEditableEqual,
  type ProjectEditable,
} from "@/domain/projectDraft";
import { formatHours } from "@/domain/format";
import { allEntries } from "@/data/repositories";
import { useInventoryStore } from "@/store/inventory";
import { useToastStore } from "@/store/toast";
import {
  Button,
  cn,
  Combobox,
  Field,
  IconButton,
  Icons,
  Input,
  Textarea,
} from "@/ui";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Attivo",
  completed: "Completato",
  paused: "In pausa",
  archived: "Archiviato",
};
const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];

const selectClasses =
  "h-9 w-full rounded border border-line bg-bg px-3 text-sm text-ink " +
  "focus:border-primary focus:outline-none";

/** Token selezionato (con rimozione) per team/referenti. */
function Token({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-primary bg-primary-wash",
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
}: {
  project: Project;
  onDeleted: () => void;
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

  const save = async () => {
    const trimmed = draft.name.trim();
    if (!trimmed) return;
    const subtaskDefs = draft.subtaskDefs
      .map((s) => ({ ...s, label: s.label.trim() }))
      .filter((s) => s.label);
    const next: ProjectEditable = { ...draft, name: trimmed, subtaskDefs };
    await saveProject({
      ...project,
      ...next,
      kind: next.clientId ? "client" : "internal",
    });
    setDraft(next);
    notify("Progetto salvato");
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
    const id = nanoid();
    await savePerson({ id, name });
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
    const id = nanoid();
    await saveContact({ id, clientId: draft.clientId, name, role: "" });
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
        <Button type="submit" variant="primary" disabled={!dirty || !draft.name.trim()}>
          Salva
        </Button>
        <Button variant="danger" onClick={() => void remove()}>
          Elimina
        </Button>
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

  const saveProject = useInventoryStore((s) => s.saveProject);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const sel = selected ? stats.get(selected.id) : undefined;
  const estMin = (selected?.estimatedHours ?? 0) * 60;
  const progressPct =
    estMin > 0 ? Math.min(100, Math.round(((sel?.totalMin ?? 0) / estMin) * 100)) : 0;

  const createProject = async () => {
    const p = newProject({ name: "Nuovo progetto", clientId: null }, nanoid());
    await saveProject(p);
    setSelectedId(p.id);
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

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
      <aside className="space-y-4">
        <Button
          variant="subtle"
          size="sm"
          className="w-full"
          onClick={() => void createProject()}
        >
          + Nuovo progetto
        </Button>
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
            {(selected.startDate || selected.endDate) && (
              <p className="tnum text-xs text-muted">
                Pianificato:{" "}
                {selected.startDate ? fmtDay(selected.startDate) : "…"} –{" "}
                {selected.endDate ? fmtDay(selected.endDate) : "…"}
              </p>
            )}
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

          {selected.estimatedHours > 0 && (
            <div className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-muted">
                  Avanzamento
                </span>
                <span className="tnum text-sm text-ink">
                  {formatHours(sel?.totalMin ?? 0)}{" "}
                  <span className="text-muted">
                    / {selected.estimatedHours}h stimate · {progressPct}%
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-line">
                <div
                  className="h-full rounded-pill bg-accent"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <ProjectEditor
            key={selected.id}
            project={selected}
            onDeleted={() => setSelectedId(null)}
          />
        </section>
      )}
    </div>
  );
}
