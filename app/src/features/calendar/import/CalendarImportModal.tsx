import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type { ISODate } from "@/data/types";
import { applyDraft } from "@/domain/entryDraft";
import { recognizeLayout } from "@/data/ocr/recognizeImage";
import {
  parseCalendarGrid,
  type GridColumn,
} from "@/domain/calendar-import/parseCalendarGrid";
import {
  eventToDraft,
  splitTitleAndPerson,
} from "@/domain/calendar-import/eventDraft";
import { resolveColumnDate } from "@/domain/calendar-import/resolveColumnDate";
import { useUiStore } from "@/store";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { isoDate } from "@/domain/calendarNav";
import { Combobox, TimeField } from "@/ui";
import { minutesToLabel } from "@/domain/slots";
import { ImportModal, type ProcessResult } from "./ImportModal";
import { matchValueOf, useMatchHelpers } from "./importMatch";

// Sentinella: l'utente sceglie esplicitamente "nessun progetto" (resta un event).
const NO_PROJECT = "__event__";

interface Row {
  key: string;
  title: string;
  date: ISODate;
  startMin: number;
  durationMin: number;
  /** "person:id" | "contact:id" | null */
  matchValue: string | null;
  /** id progetto, NO_PROJECT per "event" esplicito, o null = ancora da scegliere. */
  projectId: string | null;
}

/**
 * Import dei meeting da uno screenshot del calendario. L'OCR conserva la
 * geometria: la posizione verticale di un blocco è il suo orario, il righello
 * delle ore dà la scala. Se lo screenshot ha più giorni si sceglie quale colonna
 * importare; gli eventi finiscono sul giorno scelto col selettore "Giorno", che
 * sposta anche la vista (default: il giorno da cui si è aperto l'import).
 *
 * Dal solo titolo non si può sapere se un blocco è cliente o interno: si sceglie
 * un progetto per riga (obbligatorio, "applica a tutte" per il bulk), da cui si
 * ereditano tipo e cliente. Resta possibile "Evento (senza progetto)".
 */
export function CalendarImportModal() {
  const day = useEditorStore((s) => s.calendarImportDay);
  const close = useEditorStore((s) => s.closeCalendarImport);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const projects = useInventoryStore((s) => s.projects);
  const clients = useInventoryStore((s) => s.clients);
  const slotMinutes = useSettingsStore((s) => s.settings.slotMinutes);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const setActiveDate = useUiStore((s) => s.setActiveDate);
  const match = useMatchHelpers();
  // Giorno di destinazione, regolabile in revisione; default = giorno aperto.
  const [targetDay, setTargetDay] = useState<ISODate>(day ?? isoDate(new Date()));

  const projectOptions = useMemo(() => {
    const clientName = (id: string | null) =>
      clients.find((c) => c.id === id)?.name ?? "Cliente";
    return [
      { id: NO_PROJECT, label: "Evento (senza progetto)" },
      ...projects.map((p) => ({
        id: p.id,
        label:
          p.kind === "client" ? `${p.name} · ${clientName(p.clientId)}` : `${p.name} · Interno`,
      })),
    ];
  }, [projects, clients]);

  if (!day) return null;
  const anchor = day; // ristretto a ISODate dopo la guardia (per le closure sotto)

  const projectOf = (id: string | null) => {
    if (!id || id === NO_PROJECT) return null;
    const p = projects.find((x) => x.id === id);
    return p ? { id: p.id, kind: p.kind, clientId: p.clientId } : null;
  };

  function rowsFromColumn(col: GridColumn, date: ISODate): Row[] {
    return col.events.map((e) => {
      const { title, match: person } = splitTitleAndPerson(
        e.title,
        people,
        contacts,
      );
      return {
        key: nanoid(),
        title: title || e.title,
        date,
        startMin: e.startMin,
        durationMin: e.durationMin,
        matchValue: matchValueOf(person),
        projectId: null,
      };
    });
  }

  function goToDay(date: ISODate) {
    setTargetDay(date);
    setActiveDate(new Date(`${date}T00:00:00`));
  }

  async function process(
    source: Blob,
    onProgress: (p: number) => void,
  ): Promise<ProcessResult<Row>> {
    const layout = await recognizeLayout(source, (p) => onProgress(p.progress));
    const cols = parseCalendarGrid(layout.words, slotMinutes).filter(
      (c) => c.events.length > 0,
    );
    if (import.meta.env.DEV) {
      console.log("[Calendar import] parole OCR:", layout.words);
      console.log("[Calendar import] colonne:", cols);
    }
    if (cols.length >= 2) {
      return {
        kind: "choose",
        rawText: layout.text,
        choices: cols.map((c) => {
          const date = resolveColumnDate(c.label, anchor);
          return {
            label: c.label,
            count: c.events.length,
            day: date,
            rows: rowsFromColumn(c, date),
          };
        }),
      };
    }
    if (cols.length === 1) {
      // Colonna unica: risolvi la sua data ed impostala (sposta anche la vista).
      const date = resolveColumnDate(cols[0].label, anchor);
      goToDay(date);
      return { kind: "rows", rawText: layout.text, rows: rowsFromColumn(cols[0], date) };
    }
    return { kind: "rows", rawText: layout.text, rows: [] };
  }

  async function persist(rows: Row[]) {
    for (const r of rows) {
      const draft = eventToDraft({
        title: r.title.trim() || "Evento",
        date: r.date,
        startMin: r.startMin,
        durationMin: r.durationMin,
        match: match.decode(r.matchValue),
        project: projectOf(r.projectId),
      });
      await saveEntry(applyDraft(draft, { id: nanoid(), now: Date.now() }));
    }
  }

  return (
    <ImportModal<Row>
      title="Importa dal calendario"
      description="Carica uno screenshot della griglia: leggo gli orari dalla posizione dei blocchi e ne abbozzo le attività."
      fileLabel="Screenshot del calendario"
      noun={{ one: "evento", many: "eventi", none: "Nessun evento" }}
      choosePrompt="Quale giorno dello screenshot vuoi importare?"
      emptyReview={
        'Non ho riconosciuto nessun evento. Apri "Testo riconosciuto" qui sopra per vedere cosa ha letto l\'OCR: serve il righello delle ore a sinistra (9, 10, 11…) per calibrare gli orari.'
      }
      process={process}
      persist={persist}
      onClose={close}
      interval={(r) => ({
        date: r.date,
        startMin: r.startMin,
        endMin: r.startMin + r.durationMin,
      })}
      rowLabel={(r) => r.title}
      rowReady={(r) => r.projectId !== null}
      dayField={{
        value: targetDay,
        onChange: goToDay,
      }}
      reviewHeader={(patchAll) => (
        <div className="max-w-full">
          <Combobox
            label="Progetto (tutte)"
            placeholder="Assegna a tutte…"
            options={projectOptions}
            value={null}
            onChange={(id) => id && patchAll({ projectId: id })}
          />
        </div>
      )}
      renderRow={(r, patch) => (
        <>
          <input
            aria-label="Titolo"
            value={r.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="w-full border-b border-line bg-transparent pb-1 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-28">
              <TimeField
                label="Inizio"
                value={r.startMin}
                step={slotMinutes}
                onChange={(v) => patch({ startMin: v })}
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              durata
              <input
                type="number"
                aria-label="Durata in minuti"
                min={slotMinutes}
                step={slotMinutes}
                value={r.durationMin}
                onChange={(e) =>
                  patch({
                    durationMin: Math.max(
                      slotMinutes,
                      Number(e.target.value) || slotMinutes,
                    ),
                  })
                }
                className="tnum h-10 w-16 rounded-lg border border-line bg-bg px-2 text-sm text-ink focus:border-primary focus:outline-none"
              />
            </label>
            <span className="tnum text-xs text-faint">
              → {minutesToLabel(r.startMin + r.durationMin)}
            </span>
          </div>
          <div className="max-w-xs">
            <Combobox
              label="Progetto"
              placeholder="Scegli progetto…"
              options={projectOptions}
              value={r.projectId}
              onChange={(id) => patch({ projectId: id })}
            />
            {r.projectId === null && (
              <p className="mt-1 text-xs text-danger">Scegli un progetto</p>
            )}
          </div>
          <div className="max-w-xs">
            <Combobox
              label="Collega a"
              placeholder="Collega a…"
              options={match.options}
              value={r.matchValue}
              onChange={(id) => patch({ matchValue: id })}
            />
          </div>
        </>
      )}
    />
  );
}
