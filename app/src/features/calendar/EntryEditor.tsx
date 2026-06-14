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

/** Chip selezionabile (toggle) per le multi-selezioni dell'editor. */
function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-pill border px-2.5 py-1 text-xs transition-colors duration-[var(--dur-fast)]",
        on
          ? "border-primary bg-primary-wash text-accent"
          : "border-line text-muted hover:bg-raised hover:text-ink",
      )}
    >
      {label}
    </button>
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

  const contactOptions = useMemo(
    () => contacts.filter((k) => k.clientId === draft.clientId),
    [contacts, draft.clientId],
  );
  const toggleId = (key: "collaboratorIds" | "contactIds", id: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id)
        ? d[key].filter((x) => x !== id)
        : [...d[key], id],
    }));

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
              placeholder="Nessuno"
              options={clientOptions}
              value={draft.clientId}
              onChange={(id) => patch({ clientId: id, projectId: null })}
            />
          </Field>
          <Field label="Progetto">
            <Combobox
              label="Progetto"
              placeholder="Nessuno"
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

        {people.length > 0 && (
          <Field label="Collaboratori">
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  on={draft.collaboratorIds.includes(p.id)}
                  onClick={() => toggleId("collaboratorIds", p.id)}
                />
              ))}
            </div>
          </Field>
        )}

        {contactOptions.length > 0 && (
          <Field label="Referenti">
            <div className="flex flex-wrap gap-2">
              {contactOptions.map((k) => (
                <Chip
                  key={k.id}
                  label={k.name}
                  on={draft.contactIds.includes(k.id)}
                  onClick={() => toggleId("contactIds", k.id)}
                />
              ))}
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
