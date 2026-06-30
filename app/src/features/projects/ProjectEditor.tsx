import { useState } from "react";
import { nanoid } from "nanoid";
import type { Id, Project, ProjectStatus } from "@/data/types";
import {
  projectEditableEqual,
  type ProjectEditable,
} from "@/domain/projectDraft";
import { findByName } from "@/domain/dedupeName";
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
import { STATUS_LABEL, STATUSES } from "./meta";

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
export function ProjectEditor({
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
