import { useMemo, useRef, useState } from "react";
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
import type { PersonMatch } from "@/domain/teams/matchPerson";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useToastStore } from "@/store/toast";
import { Button, Combobox, Modal, TimeField } from "@/ui";
import { minutesToLabel } from "@/domain/slots";

type Stage = "pick" | "working" | "columns" | "review";

interface Row {
  key: string;
  title: string;
  date: ISODate;
  startMin: number;
  durationMin: number;
  /** "person:id" | "contact:id" | null */
  matchValue: string | null;
}

function matchValueOf(match: PersonMatch | null): string | null {
  return match ? `${match.kind}:${match.id}` : null;
}

function decodeMatch(
  value: string | null,
  nameOf: (kind: "person" | "contact", id: string) => string,
): PersonMatch | null {
  if (!value) return null;
  const sep = value.indexOf(":");
  const kind = value.slice(0, sep) as "person" | "contact";
  const id = value.slice(sep + 1);
  return { id, kind, name: nameOf(kind, id), confidence: 1 };
}

/**
 * Import dei meeting da uno screenshot del calendario. L'OCR conserva la
 * geometria: la posizione verticale di un blocco è il suo orario, il righello
 * delle ore dà la scala. Se lo screenshot ha più giorni si sceglie quale colonna
 * importare; gli eventi vengono creati nel giorno aperto (modificabile per riga).
 */
export function CalendarImportModal() {
  const day = useEditorStore((s) => s.calendarImportDay);
  const close = useEditorStore((s) => s.closeCalendarImport);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const slotMinutes = useSettingsStore((s) => s.settings.slotMinutes);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const notify = useToastStore((s) => s.notify);

  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<GridColumn[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const matchOptions = useMemo(
    () => [
      ...people.map((p) => ({ id: `person:${p.id}`, label: p.name })),
      ...contacts.map((c) => ({ id: `contact:${c.id}`, label: c.name })),
    ],
    [people, contacts],
  );

  const nameOf = (kind: "person" | "contact", id: string) =>
    (kind === "person"
      ? people.find((p) => p.id === id)?.name
      : contacts.find((c) => c.id === id)?.name) ?? "";

  function reset() {
    setStage("pick");
    setProgress(0);
    setError(null);
    setColumns([]);
    setRows([]);
    setRawLines([]);
  }

  function handleClose() {
    reset();
    close();
  }

  function rowsFromColumn(col: GridColumn): Row[] {
    return col.events.map((e) => {
      const { title, match } = splitTitleAndPerson(e.title, people, contacts);
      return {
        key: nanoid(),
        title: title || e.title,
        date: day as ISODate,
        startMin: e.startMin,
        durationMin: e.durationMin,
        matchValue: matchValueOf(match),
      };
    });
  }

  async function run(source: Blob) {
    setStage("working");
    setError(null);
    setProgress(0);
    try {
      const layout = await recognizeLayout(source, (p) => setProgress(p.progress));
      setRawLines(layout.text.split(/\r?\n/).filter((l) => l.trim()));
      const cols = parseCalendarGrid(layout.words, slotMinutes).filter(
        (c) => c.events.length > 0,
      );
      if (import.meta.env.DEV) {
        console.log("[Calendar import] parole OCR:", layout.words);
        console.log("[Calendar import] colonne:", cols);
      }
      setColumns(cols);
      if (cols.length === 0) {
        setRows([]);
        setStage("review");
      } else if (cols.length === 1) {
        setRows(rowsFromColumn(cols[0]));
        setStage("review");
      } else {
        setStage("columns");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Errore imprevisto durante l'OCR.",
      );
      setStage("pick");
    }
  }

  function onFile(file: File | undefined) {
    if (file) void run(file);
  }

  function onPaste(e: React.ClipboardEvent) {
    if (stage !== "pick") return;
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      void run(file);
    }
  }

  function patch(key: string, next: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...next } : r)));
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  async function confirm() {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      for (const r of rows) {
        const draft = eventToDraft({
          title: r.title.trim() || "Evento",
          date: r.date,
          startMin: r.startMin,
          durationMin: r.durationMin,
          match: decodeMatch(r.matchValue, nameOf),
        });
        await saveEntry(applyDraft(draft, { id: nanoid(), now: Date.now() }));
      }
      notify(
        rows.length === 1 ? "Attività creata" : `${rows.length} attività create`,
      );
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  if (!day) return null;

  return (
    <Modal
      open
      onClose={handleClose}
      title="Importa dal calendario"
      description="Carica uno screenshot della griglia: leggo gli orari dalla posizione dei blocchi e ne abbozzo le attività."
      size="lg"
      footer={
        stage === "review" ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted">
              {rows.length === 0
                ? "Nessun evento"
                : `${rows.length} ${rows.length === 1 ? "evento" : "eventi"}`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Riprova
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={rows.length === 0 || saving}
                onClick={() => void confirm()}
              >
                {saving ? "Creo…" : "Crea attività"}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div onPaste={onPaste}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label="Screenshot del calendario"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {stage === "pick" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="max-w-sm text-sm text-muted">
              Scegli un'immagine o incollala qui (⌘/Ctrl+V). L'elaborazione resta
              sul tuo dispositivo, niente caricamenti.
            </p>
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              Scegli screenshot…
            </Button>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}

        {stage === "working" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-ink">Lettura dello screenshot…</p>
            <div className="h-1.5 w-56 overflow-hidden rounded-pill bg-raised">
              <div
                className="h-full rounded-pill bg-primary transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="tnum text-xs text-faint">
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {stage === "columns" && (
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted">
              Quale giorno vuoi importare? Gli eventi verranno creati nel giorno
              aperto.
            </p>
            <div className="flex flex-wrap gap-2">
              {columns.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRows(rowsFromColumn(c));
                    setStage("review");
                  }}
                  className="rounded-lg border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-raised"
                >
                  {c.label}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {c.events.length}{" "}
                    {c.events.length === 1 ? "evento" : "eventi"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === "review" && rawLines.length > 0 && (
          <details className="mb-3 rounded-lg border border-line bg-bg px-3 py-2 text-xs">
            <summary className="cursor-pointer select-none text-muted">
              Testo riconosciuto ({rawLines.length} righe)
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ink/80">
              {rawLines.join("\n")}
            </pre>
          </details>
        )}

        {stage === "review" &&
          (rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Non ho riconosciuto nessun evento. Apri "Testo riconosciuto" qui
              sopra per vedere cosa ha letto l'OCR: serve il righello delle ore a
              sinistra (9, 10, 11…) per calibrare gli orari.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 py-1">
              {rows.map((r) => (
                <li
                  key={r.key}
                  className="rounded-lg border border-line bg-bg p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        aria-label="Titolo"
                        value={r.title}
                        onChange={(e) => patch(r.key, { title: e.target.value })}
                        className="w-full border-b border-line bg-transparent pb-1 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          aria-label="Giorno"
                          value={r.date}
                          onChange={(e) => patch(r.key, { date: e.target.value })}
                          className="tnum h-10 rounded-lg border border-line bg-bg px-2.5 text-sm text-ink focus:border-primary focus:outline-none"
                        />
                        <div className="w-28">
                          <TimeField
                            label="Inizio"
                            value={r.startMin}
                            step={slotMinutes}
                            onChange={(v) => patch(r.key, { startMin: v })}
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
                              patch(r.key, {
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
                          label="Collega a"
                          placeholder="Collega a…"
                          options={matchOptions}
                          value={r.matchValue}
                          onChange={(id) => patch(r.key, { matchValue: id })}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      aria-label="Scarta"
                      className="shrink-0 rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-raised hover:text-danger"
                    >
                      Scarta
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </Modal>
  );
}
