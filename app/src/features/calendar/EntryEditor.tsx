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
import { minutesToLabel } from "@/domain/slots";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import {
  Button,
  Combobox,
  Field,
  Input,
  Modal,
  Segmented,
  Textarea,
  type SegmentedOption,
} from "@/ui";

const TYPES: SegmentedOption<EntryType>[] = [
  { id: "client", label: "Cliente" },
  { id: "internal", label: "Interno" },
  { id: "event", label: "Evento" },
  { id: "vacation", label: "Ferie" },
];

/** "HH:MM" → minuti dalla mezzanotte. */
function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
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
  const clients = useInventoryStore((s) => s.clients);
  const projects = useInventoryStore((s) => s.projects);

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
  const patch = (p: Partial<EntryDraft>) => setDraft((d) => ({ ...d, ...p }));

  function onSave() {
    if (!valid) return;
    const entry = applyDraft(draft, {
      id: nanoid(),
      now: Date.now(),
      base: base ?? undefined,
    });
    void saveEntry(entry);
    close();
  }

  function onDelete() {
    if (base) void removeEntry(base.id);
    close();
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
            <Input
              type="time"
              aria-label="Inizio"
              value={minutesToLabel(draft.startMin)}
              onChange={(e) => patch({ startMin: timeToMinutes(e.target.value) })}
            />
          </Field>
          <Field label="Fine">
            <Input
              type="time"
              aria-label="Fine"
              value={minutesToLabel(draft.endMin)}
              onChange={(e) => patch({ endMin: timeToMinutes(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Tipo">
          <Segmented
            label="Tipo"
            options={TYPES}
            value={draft.type}
            onChange={(type) => patch({ type })}
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

        <Field label="Note">
          <Textarea
            aria-label="Note"
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Dettagli, contesto…"
          />
        </Field>

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
            <Button variant="primary" disabled={!valid} onClick={onSave}>
              Salva
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
