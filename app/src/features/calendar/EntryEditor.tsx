import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type { EntryType } from "@/data/types";
import {
  applyDraft,
  draftFromEntry,
  emptyDraft,
  isDraftValid,
  type EntryDraft,
} from "@/domain/entryDraft";
import { conflictsOnDay } from "@/domain/conflict";
import { collaboratorCandidateIds } from "@/domain/collaborators";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
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
  MarkdownEditor,
  Modal,
  Segmented,
  Textarea,
  TimeField,
  type SegmentedOption,
} from "@/ui";

const TYPES: SegmentedOption<EntryType>[] = [
  { id: "client", label: "Cliente" },
  { id: "internal", label: "Interno" },
  { id: "event", label: "Evento" },
  { id: "vacation", label: "Ferie" },
];

/** Token selezionato (con rimozione) per le multi-selezioni dell'editor. */
function Token({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-primary bg-primary-wash",
        "py-1 pl-2.5 pr-1 text-xs text-accent",
      )}
    >
      {label}
      <IconButton
        label={`Rimuovi ${label}`}
        size="sm"
        className="h-5 w-5"
        onClick={onRemove}
      >
        <Icons.IconClose size={13} />
      </IconButton>
    </span>
  );
}

/**
 * Editor rapido di una attività (Modal). Crea o modifica una Entry; il selettore
 * Progetto deriva il Cliente (cascata). Persistenza via calendar store.
 */
export function EntryEditor() {
  const open = useEditorStore((s) => s.open);
  const base = useEditorStore((s) => s.base);
  const seed = useEditorStore((s) => s.seed);
  const close = useEditorStore((s) => s.close);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const removeEntry = useCalendarStore((s) => s.removeEntry);
  const undo = useCalendarStore((s) => s.undo);
  const entries = useCalendarStore((s) => s.entries);
  const notify = useToastStore((s) => s.notify);
  const clients = useInventoryStore((s) => s.clients);
  const projects = useInventoryStore((s) => s.projects);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const saveClient = useInventoryStore((s) => s.saveClient);
  const saveProject = useInventoryStore((s) => s.saveProject);
  const savePerson = useInventoryStore((s) => s.savePerson);
  const saveContact = useInventoryStore((s) => s.saveContact);
  const slotMinutes = useSettingsStore((s) => s.settings.slotMinutes);

  const [draft, setDraft] = useState<EntryDraft>(() =>
    emptyDraft(seed.date, seed.startMin, seed.endMin),
  );

  // Re-inizializza la bozza ad ogni apertura (nuova o da entry esistente).
  useEffect(() => {
    if (!open) return;
    setDraft(
      base
        ? draftFromEntry(base)
        : emptyDraft(seed.date, seed.startMin, seed.endMin),
    );
  }, [open, base, seed]);

  const subtypes = useSettingsStore((s) => s.settings.subtypes);
  const subtypeOptions = useMemo(() => {
    const list =
      draft.type === "client"
        ? subtypes.client
        : draft.type === "internal"
          ? subtypes.internal
          : [];
    return list.map((s) => ({ id: s.id, label: s.label }));
  }, [subtypes, draft.type]);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ id: c.id, label: c.name })),
    [clients],
  );
  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.clientId === draft.clientId)
        .map((p) => ({ id: p.id, label: p.name })),
    [projects, draft.clientId],
  );

  const valid = isDraftValid(draft);
  const conflict =
    valid &&
    conflictsOnDay(
      draft.date,
      draft.startMin,
      draft.endMin,
      entries,
      base?.id ?? null,
    );
  const patch = (p: Partial<EntryDraft>) => setDraft((d) => ({ ...d, ...p }));

  const addLink = () =>
    setDraft((d) => ({ ...d, links: [...d.links, { label: "", url: "" }] }));
  const patchLink = (i: number, p: Partial<{ label: string; url: string }>) =>
    setDraft((d) => ({
      ...d,
      links: d.links.map((l, j) => (j === i ? { ...l, ...p } : l)),
    }));
  const removeLink = (i: number) =>
    setDraft((d) => ({ ...d, links: d.links.filter((_, j) => j !== i) }));

  const removeId = (key: "collaboratorIds" | "contactIds", id: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].filter((x) => x !== id) }));
  const addId = (key: "collaboratorIds" | "contactIds", id: string) =>
    setDraft((d) =>
      d[key].includes(id) ? d : { ...d, [key]: [...d[key], id] },
    );

  // Collaboratori: candidati dai team dei progetti (cliente+progetto).
  const candidateIds = useMemo(
    () => collaboratorCandidateIds(projects, draft.projectId, draft.clientId),
    [projects, draft.projectId, draft.clientId],
  );
  const selectedCollaborators = draft.collaboratorIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const collaboratorAddOptions = useMemo(
    () =>
      people
        .filter(
          (p) =>
            candidateIds.includes(p.id) &&
            !draft.collaboratorIds.includes(p.id),
        )
        .map((p) => ({ id: p.id, label: p.name })),
    [people, candidateIds, draft.collaboratorIds],
  );

  // Referenti: contatti del cliente selezionato.
  const selectedContacts = draft.contactIds
    .map((id) => contacts.find((k) => k.id === id))
    .filter((k): k is NonNullable<typeof k> => !!k);
  const contactAddOptions = useMemo(
    () =>
      contacts
        .filter(
          (k) =>
            k.clientId === draft.clientId && !draft.contactIds.includes(k.id),
        )
        .map((k) => ({ id: k.id, label: k.name })),
    [contacts, draft.clientId, draft.contactIds],
  );

  async function createClient(name: string) {
    const id = nanoid();
    await saveClient({ id, name, color: null, createdAt: Date.now() });
    patch({ clientId: id, projectId: null });
  }

  async function createProject(name: string) {
    const id = nanoid();
    const clientId = draft.clientId;
    await saveProject({
      id,
      clientId,
      kind: clientId ? "client" : "internal",
      name,
      subtaskDefs: [],
      status: "active",
      description: "",
      objectives: "",
      startDate: "",
      endDate: "",
      teamIds: [],
      contactIds: [],
      estimatedHours: 0,
    });
    patch({ projectId: id, clientId });
  }

  async function createCollaborator(name: string) {
    const id = nanoid();
    await savePerson({ id, name });
    // Lega la persona al team del progetto, così ricompare la volta dopo.
    const proj = projects.find((p) => p.id === draft.projectId);
    if (proj && !proj.teamIds.includes(id)) {
      await saveProject({ ...proj, teamIds: [...proj.teamIds, id] });
    }
    addId("collaboratorIds", id);
  }

  async function createContact(name: string) {
    if (!draft.clientId) return;
    const id = nanoid();
    await saveContact({ id, clientId: draft.clientId, name, role: "" });
    addId("contactIds", id);
  }

  async function onSave() {
    if (!valid || conflict) return;
    const isNew = !base;
    const entry = applyDraft(draft, {
      id: nanoid(),
      now: Date.now(),
      base: base ?? undefined,
    });
    await saveEntry(entry);
    close();
    notify(isNew ? "Attività creata" : "Attività salvata", {
      action: { label: "Annulla", run: () => void undo() },
    });
  }

  async function onDelete() {
    if (!base) return;
    await removeEntry(base.id);
    close();
    notify("Attività eliminata", {
      variant: "danger",
      action: { label: "Annulla", run: () => void undo() },
    });
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={base ? "Modifica attività" : "Nuova attività"}
    >
      <div className="space-y-4">
        <Field label="Titolo">
          <Input
            aria-label="Titolo"
            autoFocus
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Cosa hai fatto?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Data">
            <Input
              type="date"
              aria-label="Data"
              value={draft.date}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </Field>
          <Field label="Inizio">
            <TimeField
              label="Inizio"
              step={slotMinutes}
              value={draft.startMin}
              onChange={(startMin) => patch({ startMin })}
            />
          </Field>
          <Field label="Fine">
            <TimeField
              label="Fine"
              step={slotMinutes}
              value={draft.endMin}
              onChange={(endMin) => patch({ endMin })}
            />
          </Field>
        </div>

        <Field label="Tipo">
          <Segmented
            label="Tipo"
            options={TYPES}
            value={draft.type}
            onChange={(type) => patch({ type, subtypeId: null })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cliente">
            <Combobox
              label="Cliente"
              placeholder="Cerca o crea…"
              options={clientOptions}
              value={draft.clientId}
              onChange={(id) => patch({ clientId: id, projectId: null })}
              onCreate={(name) => void createClient(name)}
            />
          </Field>
          <Field label="Progetto">
            <Combobox
              label="Progetto"
              placeholder="Cerca o crea…"
              options={projectOptions}
              value={draft.projectId}
              onChange={(id) =>
                patch({
                  projectId: id,
                  clientId:
                    projects.find((p) => p.id === id)?.clientId ??
                    draft.clientId,
                })
              }
              onCreate={(name) => void createProject(name)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subtypeOptions.length > 0 && (
            <Field label="Sottotipo">
              <Combobox
                label="Sottotipo"
                placeholder="Nessuno"
                options={subtypeOptions}
                value={draft.subtypeId}
                onChange={(subtypeId) => patch({ subtypeId })}
              />
            </Field>
          )}
          <Field label="Milestone">
            <Input
              aria-label="Milestone"
              value={draft.milestone}
              onChange={(e) => patch({ milestone: e.target.value })}
              placeholder="Es. Fase 2, Rilascio…"
            />
          </Field>
        </div>

        <Field label="Note">
          <MarkdownEditor
            label="Note"
            value={draft.notes}
            onChange={(notes) => patch({ notes })}
            placeholder="Dettagli, contesto… (Markdown supportato)"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cosa è andato storto">
            <Textarea
              aria-label="Cosa è andato storto"
              value={draft.blockers}
              onChange={(e) => patch({ blockers: e.target.value })}
              placeholder="Problemi o blocchi incontrati"
            />
          </Field>
          <Field label="Prossimi passi">
            <Textarea
              aria-label="Prossimi passi"
              value={draft.nextSteps}
              onChange={(e) => patch({ nextSteps: e.target.value })}
              placeholder="Cosa fare la prossima volta"
            />
          </Field>
        </div>

        <Field label="Link">
          <div className="space-y-2">
            {draft.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Etichetta link ${i + 1}`}
                  value={link.label}
                  onChange={(e) => patchLink(i, { label: e.target.value })}
                  placeholder="Etichetta"
                  className="flex-1"
                />
                <Input
                  aria-label={`URL link ${i + 1}`}
                  type="url"
                  value={link.url}
                  onChange={(e) => patchLink(i, { url: e.target.value })}
                  placeholder="https://…"
                  className="flex-[2]"
                />
                <IconButton
                  label={`Rimuovi link ${i + 1}`}
                  size="sm"
                  onClick={() => removeLink(i)}
                >
                  <Icons.IconClose size={16} />
                </IconButton>
              </div>
            ))}
            <Button variant="ghost" onClick={addLink}>
              <Icons.IconPlus size={16} />
              Aggiungi link
            </Button>
          </div>
        </Field>

        <Field label="Collaboratori">
          <div className="space-y-2">
            {selectedCollaborators.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCollaborators.map((p) => (
                  <Token
                    key={p.id}
                    label={p.name}
                    onRemove={() => removeId("collaboratorIds", p.id)}
                  />
                ))}
              </div>
            )}
            <Combobox
              key={`collab-${draft.collaboratorIds.length}`}
              label="Aggiungi collaboratore"
              placeholder={
                candidateIds.length || draft.projectId || draft.clientId
                  ? "Cerca o crea…"
                  : "Scegli prima cliente o progetto"
              }
              options={collaboratorAddOptions}
              value={null}
              onChange={(id) => addId("collaboratorIds", id)}
              onCreate={(name) => void createCollaborator(name)}
            />
          </div>
        </Field>

        {(draft.clientId || selectedContacts.length > 0) && (
          <Field label="Referenti">
            <div className="space-y-2">
              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map((k) => (
                    <Token
                      key={k.id}
                      label={k.name}
                      onRemove={() => removeId("contactIds", k.id)}
                    />
                  ))}
                </div>
              )}
              {draft.clientId && (
                <Combobox
                  key={`contact-${draft.contactIds.length}`}
                  label="Aggiungi referente"
                  placeholder="Cerca o crea…"
                  options={contactAddOptions}
                  value={null}
                  onChange={(id) => addId("contactIds", id)}
                  onCreate={(name) => void createContact(name)}
                />
              )}
            </div>
          </Field>
        )}

        {conflict && (
          <p role="alert" className="text-sm text-danger">
            Si sovrappone a un'altra attività di quel giorno.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {base && (
              <Button variant="danger" onClick={onDelete}>
                Elimina
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={close}>
              Annulla
            </Button>
            <Button
              variant="primary"
              disabled={!valid || conflict}
              onClick={onSave}
            >
              Salva
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
