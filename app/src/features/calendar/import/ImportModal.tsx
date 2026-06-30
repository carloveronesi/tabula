/**
 * Pannello laterale di import da screenshot (calendario, Teams). Gestisce ciò che
 * è identico tra i due: scelta/incolla dell'immagine, barra di progresso dell'OCR,
 * eventuale scelta tra più colonne, e la lista di revisione con Scarta/Crea. Mentre
 * si rivede, pubblica le righe come blocchi-anteprima ([[importPreviewStore]]) così
 * la vista Giorno le disegna sulla griglia con posizione e durata reali.
 *
 * Ogni modale fornisce la propria pipeline (`process`), il rendering della riga
 * (`renderRow`), il salvataggio (`persist`) e gli accessori orario/titolo.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ISODate } from "@/data/types";
import { Button } from "@/ui";
import { IconClose } from "@/ui/icons";
import { useToastStore } from "@/store/toast";
import { useCalendarStore } from "@/store/calendar";
import { findConflicts } from "./importConflicts";
import { useImportPreviewStore, type PreviewBlock } from "./importPreviewStore";

export interface ImportChoice<R> {
  label: string;
  count: number;
  rows: R[];
  /** Giorno risolto della colonna: scegliendola, vi si imposta l'import e la vista. */
  day?: ISODate;
}

/** Esito di `process`: righe pronte, o più colonne tra cui far scegliere. */
export type ProcessResult<R> =
  | { kind: "rows"; rows: R[]; rawText: string }
  | { kind: "choose"; choices: ImportChoice<R>[]; rawText: string };

export interface ImportNoun {
  /** Singolare per i conteggi ("evento"). */
  one: string;
  /** Plurale per i conteggi ("eventi"). */
  many: string;
  /** Frase per "nessuno" ("Nessun evento"). */
  none: string;
}

export interface ImportModalProps<R extends { key: string }> {
  title: string;
  description: string;
  fileLabel: string;
  noun: ImportNoun;
  /** Testo mostrato in revisione quando non c'è nessuna riga. */
  emptyReview: ReactNode;
  /** Etichetta sopra i pulsanti di scelta colonna (solo se `process` sceglie). */
  choosePrompt?: ReactNode;
  process: (
    blob: Blob,
    onProgress: (p: number) => void,
  ) => Promise<ProcessResult<R>>;
  /** Intervallo occupato dalla riga, per rilevare le sovrapposizioni. */
  interval: (row: R) => { date: ISODate; startMin: number; endMin: number };
  /** Titolo della riga, per il fantasma sulla griglia. */
  rowLabel: (row: R) => string;
  /**
   * Selettore "Giorno" unico (import a giorno singolo, es. calendario): sposta
   * tutte le righe su quel giorno. Lo shell patcha le righe con `applyToRow` e
   * notifica `onChange` (il wrapper sposta la vista). Assente per import su più
   * giorni (es. Teams).
   */
  dayField?: {
    value: ISODate;
    onChange: (date: ISODate) => void;
    applyToRow: (date: ISODate) => Partial<R>;
  };
  /** Controlli in cima alla revisione (es. "applica a tutte"); `patchAll` aggiorna ogni riga. */
  reviewHeader?: (patchAll: (next: Partial<R>) => void) => ReactNode;
  /** Riga pronta da creare. Se assente, sempre pronta; altrimenti "Crea" è bloccato finché non lo sono tutte. */
  rowReady?: (row: R) => boolean;
  /** Blocco campi della riga; `patch` aggiorna quella riga. */
  renderRow: (row: R, patch: (next: Partial<R>) => void) => ReactNode;
  /** Persiste le righe. Lo shell gestisce stato di salvataggio, toast e chiusura. */
  persist: (rows: R[]) => Promise<void>;
  onClose: () => void;
}

type Stage = "pick" | "working" | "columns" | "review";

export function ImportModal<R extends { key: string }>(props: ImportModalProps<R>) {
  const notify = useToastStore((s) => s.notify);
  const entries = useCalendarStore((s) => s.entries);
  const setPreview = useImportPreviewStore((s) => s.setBlocks);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<R[]>([]);
  const [choices, setChoices] = useState<ImportChoice<R>[]>([]);
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setStage("pick");
    setProgress(0);
    setError(null);
    setRows([]);
    setChoices([]);
    setRawText("");
  }

  function handleClose() {
    reset();
    props.onClose();
  }

  async function run(source: Blob) {
    setStage("working");
    setError(null);
    setProgress(0);
    try {
      const res = await props.process(source, setProgress);
      setRawText(res.rawText);
      if (res.kind === "choose") {
        setChoices(res.choices);
        setStage("columns");
      } else {
        setRows(res.rows);
        setStage("review");
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

  function patch(key: string, next: Partial<R>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...next } : r)));
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  function patchAll(next: Partial<R>) {
    setRows((rs) => rs.map((r) => ({ ...r, ...next })));
  }

  async function confirm() {
    if (rows.length === 0 || notReady > 0) return;
    setSaving(true);
    try {
      await props.persist(rows);
      notify(
        rows.length === 1 ? "Attività creata" : `${rows.length} attività create`,
      );
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  const count = (n: number) =>
    n === 0 ? props.noun.none : `${n} ${n === 1 ? props.noun.one : props.noun.many}`;

  // Righe non ancora pronte (es. senza progetto): bloccano la creazione.
  const notReady = props.rowReady
    ? rows.filter((r) => !props.rowReady!(r)).length
    : 0;

  // Sovrapposizioni col giorno e tra le righe; si ricalcola a ogni modifica d'orario.
  const conflictOf = findConflicts(
    rows.map((r) => ({ key: r.key, ...props.interval(r) })),
    entries,
  );

  function setAllToDay(date: ISODate) {
    const field = props.dayField;
    if (!field) return;
    setRows((rs) => rs.map((r) => ({ ...r, ...field.applyToRow(date) })));
    field.onChange(date);
  }

  // Anteprima sulla griglia: le righe in revisione come blocchi fantasma.
  const previews: PreviewBlock[] =
    stage === "review"
      ? rows.map((r) => {
          const iv = props.interval(r);
          return {
            key: r.key,
            date: iv.date,
            label: props.rowLabel(r),
            startMin: iv.startMin,
            endMin: iv.endMin,
            conflict: conflictOf.has(r.key),
          };
        })
      : [];
  const sig = previews
    .map((p) => `${p.key}:${p.date}:${p.label}:${p.startMin}:${p.endMin}:${p.conflict}`)
    .join("|");
  useEffect(() => {
    setPreview(previews);
    // ricalcolata solo quando la firma cambia, per non rimbalzare gli aggiornamenti
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, setPreview]);
  useEffect(() => () => setPreview([]), [setPreview]);

  return (
    <aside className="flex min-h-0 w-80 flex-none flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card lg:w-96">
      <header className="flex items-start justify-between gap-2 border-b border-line p-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{props.title}</h2>
          <p className="mt-0.5 text-xs leading-snug text-muted">
            {props.description}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Chiudi"
          className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </header>

      <div onPaste={onPaste} className="min-h-0 flex-1 overflow-y-auto p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          aria-label={props.fileLabel}
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
          <div className="flex flex-col gap-3 py-2">
            {props.choosePrompt && (
              <p className="text-sm text-muted">{props.choosePrompt}</p>
            )}
            <div className="flex flex-col gap-2">
              {choices.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRows(c.rows);
                    if (props.dayField && c.day) props.dayField.onChange(c.day);
                    setStage("review");
                  }}
                  className="rounded-lg border border-line bg-bg px-4 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-raised"
                >
                  {c.label}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {c.count} {c.count === 1 ? props.noun.one : props.noun.many}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === "review" && rawText && (
          <details className="mb-3 rounded-lg border border-line bg-bg px-3 py-2 text-xs">
            <summary className="cursor-pointer select-none text-muted">
              Testo riconosciuto
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ink/80">
              {rawText}
            </pre>
          </details>
        )}

        {stage === "review" && rows.length > 0 && (props.dayField || props.reviewHeader) && (
          <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-bg p-3">
            {props.dayField && (
              <label className="flex items-center gap-2 text-sm text-muted">
                Giorno
                <input
                  type="date"
                  aria-label="Giorno di destinazione"
                  value={props.dayField.value}
                  onChange={(e) => e.target.value && setAllToDay(e.target.value)}
                  className="tnum h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink focus:border-primary focus:outline-none"
                />
              </label>
            )}
            {props.reviewHeader?.(patchAll)}
          </div>
        )}

        {stage === "review" &&
          (rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{props.emptyReview}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((r) => (
                <li
                  key={r.key}
                  className="rounded-lg border border-line bg-bg p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {props.renderRow(r, (next) => patch(r.key, next))}
                      {conflictOf.has(r.key) && (
                        <p role="alert" className="text-xs text-danger">
                          {conflictOf.get(r.key)}
                        </p>
                      )}
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

      {stage === "review" && (
        <footer className="flex items-center justify-between gap-2 border-t border-line p-3">
          <span className="text-sm text-muted">
            {count(rows.length)}
            {notReady > 0 ? (
              <span className="text-danger">
                {" · "}
                {notReady} senza progetto
              </span>
            ) : (
              conflictOf.size > 0 && (
                <span className="text-danger">
                  {" · "}
                  {conflictOf.size} in conflitto
                </span>
              )
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              Riprova
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={rows.length === 0 || saving || notReady > 0}
              onClick={() => void confirm()}
            >
              {saving ? "Creo…" : "Crea attività"}
            </Button>
          </div>
        </footer>
      )}
    </aside>
  );
}
