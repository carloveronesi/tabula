/**
 * Shell condiviso dei modali di import da screenshot (calendario, Teams). Gestisce
 * tutto ciò che è identico tra i due: scelta/incolla dell'immagine, barra di
 * progresso dell'OCR, eventuale scelta tra più colonne, blocco "Testo riconosciuto"
 * e la lista di revisione con Scarta/Crea. Ogni modale fornisce solo la propria
 * pipeline (`process`), il rendering della riga (`renderRow`) e il salvataggio
 * (`persist`).
 */
import { useRef, useState, type ReactNode } from "react";
import { Button, Modal } from "@/ui";
import { useToastStore } from "@/store/toast";

export interface ImportChoice<R> {
  label: string;
  count: number;
  rows: R[];
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
  /** Blocco campi della riga; `patch` aggiorna quella riga. */
  renderRow: (row: R, patch: (next: Partial<R>) => void) => ReactNode;
  /** Persiste le righe. Lo shell gestisce stato di salvataggio, toast e chiusura. */
  persist: (rows: R[]) => Promise<void>;
  onClose: () => void;
}

type Stage = "pick" | "working" | "columns" | "review";

export function ImportModal<R extends { key: string }>(props: ImportModalProps<R>) {
  const notify = useToastStore((s) => s.notify);
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

  async function confirm() {
    if (rows.length === 0) return;
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

  return (
    <Modal
      open
      onClose={handleClose}
      title={props.title}
      description={props.description}
      size="lg"
      footer={
        stage === "review" ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted">{count(rows.length)}</span>
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
          <div className="flex flex-col gap-3 py-4">
            {props.choosePrompt && (
              <p className="text-sm text-muted">{props.choosePrompt}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {choices.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setRows(c.rows);
                    setStage("review");
                  }}
                  className="rounded-lg border border-line bg-bg px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-raised"
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

        {stage === "review" &&
          (rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{props.emptyReview}</p>
          ) : (
            <ul className="flex flex-col gap-3 py-1">
              {rows.map((r) => (
                <li
                  key={r.key}
                  className="rounded-lg border border-line bg-bg p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      {props.renderRow(r, (next) => patch(r.key, next))}
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
