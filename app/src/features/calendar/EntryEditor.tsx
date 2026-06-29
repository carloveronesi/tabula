import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { Entry, EntryType } from "@/data/types";
import {
  applyDraft,
  draftFromEntry,
  emptyDraft,
  isDraftValid,
  type EntryDraft,
} from "@/domain/entryDraft";
import { conflictsOnDay } from "@/domain/conflict";
import { dayPresets, minutesToLabel, outsideWorkHours } from "@/domain/slots";
import {
  collaboratorCandidateIds,
  rankCandidatesByHistory,
} from "@/domain/collaborators";
import { allEntries } from "@/data/repositories";
import { findByName } from "@/domain/dedupeName";
import { useEditorStore, type EditorSeed } from "@/store/editor";
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

/** Bozza iniziale per una nuova entry, con le pre-compilazioni del seed
 * (titolo/cliente passati dal quick-add con "Più dettagli"). */
function seedDraft(seed: EditorSeed): EntryDraft {
  return {
    ...emptyDraft(seed.date, seed.startMin, seed.endMin),
    title: seed.title ?? "",
    clientId: seed.clientId ?? null,
    type: seed.type ?? "client",
    projectId: seed.projectId ?? null,
    subtypeId: seed.subtypeId ?? null,
  };
}

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
  const workHours = useSettingsStore((s) => s.settings.workHours);

  const [draft, setDraft] = useState<EntryDraft>(() => seedDraft(seed));
  // Conferma "a due passi" dell'eliminazione (resa nel footer).
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Re-inizializza la bozza ad ogni apertura (nuova o da entry esistente).
  useEffect(() => {
    if (!open) return;
    setDraft(base ? draftFromEntry(base) : seedDraft(seed));
    setConfirmingDelete(false);
  }, [open, base, seed]);

  // Archivio completo: serve solo a ordinare i collaboratori per frequenza.
  // Caricato all'apertura. ponytail: scan dell'intera tabella entries a ogni
  // apertura; se diventa pesante, cache in uno store o indice per cliente.
  const [archive, setArchive] = useState<Entry[]>([]);
  useEffect(() => {
    if (!open) return;
    void allEntries().then(setArchive);
  }, [open]);

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
  // Avviso (non bloccante): orario nella pausa o fuori dalle fasce di lavoro.
  const offHours = valid && outsideWorkHours(draft.startMin, draft.endMin, workHours);
  const workWindow = `${minutesToLabel(workHours.morningStart)}–${minutesToLabel(
    workHours.morningEnd,
  )}, ${minutesToLabel(workHours.afternoonStart)}–${minutesToLabel(workHours.afternoonEnd)}`;
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

  // Collaboratori: candidati dai team dei progetti (cliente+progetto),
  // riordinati per frequenza di collaborazione reale sullo storico.
  const candidateIds = useMemo(
    () =>
      rankCandidatesByHistory(
        collaboratorCandidateIds(projects, draft.projectId, draft.clientId),
        archive,
        draft.projectId,
        draft.clientId,
      ),
    [projects, archive, draft.projectId, draft.clientId],
  );
  const selectedCollaborators = draft.collaboratorIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const collaboratorAddOptions = useMemo(
    () =>
      candidateIds
        .filter((id) => !draft.collaboratorIds.includes(id))
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p)
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
    // Riusa una persona con lo stesso nome se esiste già: niente doppioni.
    const existing = findByName(people, name);
    const id = existing?.id ?? nanoid();
    if (!existing) await savePerson({ id, name });
    // Lega la persona al team del progetto, così ricompare la volta dopo.
    const proj = projects.find((p) => p.id === draft.projectId);
    if (proj && !proj.teamIds.includes(id)) {
      await saveProject({ ...proj, teamIds: [...proj.teamIds, id] });
    }
    addId("collaboratorIds", id);
  }

  async function createContact(name: string) {
    if (!draft.clientId) return;
    // Riusa un referente dello stesso cliente con lo stesso nome.
    const existing = findByName(
      contacts.filter((k) => k.clientId === draft.clientId),
      name,
    );
    const id = existing?.id ?? nanoid();
    if (!existing) await saveContact({ id, clientId: draft.clientId, name, role: "" });
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

  // Ctrl/Cmd+Invio salva da qualsiasi campo (ref per evitare closure stantie).
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={close}
      variant="full"
      title={base ? "Modifica attività" : "Nuova attività"}
      header={
        <input
          aria-label="Titolo"
          autoFocus
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Cosa hai fatto?"
          className={cn(
            "w-full border-b border-line bg-transparent pb-1 text-2xl font-semibold tracking-tight text-ink",
            "transition-colors placeholder:font-normal placeholder:text-faint",
            "focus:border-primary focus:outline-none",
          )}
        />
      }
      footer={
        <div className="space-y-3">
          {conflict && (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-sm text-danger"
            >
              Si sovrappone a un'altra attività di quel giorno.
            </p>
          )}
          {offHours && (
            <p
              role="status"
              className="flex items-center gap-1.5 text-sm text-muted"
            >
              Orario fuori dalla giornata lavorativa ({workWindow}): puoi salvare
              comunque.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              {base &&
                (confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">Eliminare?</span>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      No
                    </Button>
                    <Button variant="danger" onClick={onDelete}>
                      Elimina
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Elimina
                  </Button>
                ))}
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
      }
    >
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
          {/* Colonna sinistra — classificazione: quando, chi, dove. */}
          <div className="space-y-5">
            <Field label="Tipo">
              <Segmented
                label="Tipo"
                options={TYPES}
                value={draft.type}
                onChange={(type) =>
                  patch(
                    type === "client"
                      ? { type, subtypeId: null }
                      : {
                          // Solo le attività su cliente hanno cliente/referenti:
                          // cambiando tipo si azzerano per non lasciare dati orfani.
                          type,
                          subtypeId: null,
                          clientId: null,
                          projectId: null,
                          contactIds: [],
                        },
                  )
                }
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

            <div
              role="group"
              aria-label="Durata rapida"
              className="flex flex-wrap items-center gap-1.5"
            >
              {dayPresets(workHours).map((p) => {
                const active =
                  draft.startMin === p.startMin && draft.endMin === p.endMin;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({ startMin: p.startMin, endMin: p.endMin })}
                    className={cn(
                      "rounded-pill border px-2.5 py-1 text-xs font-medium",
                      "transition-colors duration-[var(--dur-fast)] ease-out",
                      active
                        ? "border-primary bg-primary-wash text-accent"
                        : "border-line text-muted hover:bg-raised hover:text-ink",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "grid grid-cols-1 gap-3",
                draft.type === "client" && "sm:grid-cols-2",
              )}
            >
              {draft.type === "client" && (
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
              )}
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

            {draft.type === "client" &&
              (draft.clientId || selectedContacts.length > 0) && (
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
          </div>

          {/* Colonna destra — i testi: note e riflessione. */}
          <div className="flex h-full flex-col gap-5">
            <Field label="Note" className="flex flex-1 flex-col">
              <MarkdownEditor
                label="Note"
                value={draft.notes}
                onChange={(notes) => patch({ notes })}
                rows={8}
                grow
                placeholder="Dettagli, contesto… (Markdown supportato)"
              />
            </Field>

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
          </div>
        </div>
    </Modal>
  );
}
