import { useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { ISODate } from "@/data/types";
import { applyDraft } from "@/domain/entryDraft";
import { parseTeamsHistory, type CallDirection } from "@/domain/teams/parseHistory";
import { buildProposals } from "@/domain/teams/placeCalls";
import { proposalToDraft } from "@/domain/teams/proposalDraft";
import type { PersonMatch } from "@/domain/teams/matchPerson";
import { recognizeImage } from "@/data/ocr/recognizeImage";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useToastStore } from "@/store/toast";
import { Button, Combobox, Modal, TimeField } from "@/ui";

type Stage = "pick" | "working" | "review";

interface Row {
  key: string;
  name: string;
  date: ISODate;
  startMin: number;
  durationMin: number;
  direction: CallDirection | null;
  /** "person:id" | "contact:id" | null */
  matchValue: string | null;
}

const DIRECTION_LABEL: Record<CallDirection, string> = {
  in: "in arrivo",
  out: "in uscita",
};

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function matchValueOf(match: PersonMatch | null): string | null {
  return match ? `${match.kind}:${match.id}` : null;
}

/** Da "kind:id" alla coppia tipizzata, o null se non collegato. */
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
 * Import della cronologia chiamate Teams da screenshot: OCR in locale, parsing del
 * layout e revisione delle chiamate prima di crearle come attività-bozza. Lo
 * screenshot non riporta l'orario d'inizio, quindi gli slot proposti hanno la
 * durata giusta ma l'orario è da sistemare trascinandoli (o qui, prima di creare).
 */
export function TeamsImportModal() {
  const day = useEditorStore((s) => s.teamsImportDay);
  const close = useEditorStore((s) => s.closeTeamsImport);
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  const workHours = useSettingsStore((s) => s.settings.workHours);
  const slotMinutes = useSettingsStore((s) => s.settings.slotMinutes);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const notify = useToastStore((s) => s.notify);

  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [rawText, setRawText] = useState("");
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
    setRows([]);
    setRawText("");
  }

  function handleClose() {
    reset();
    close();
  }

  async function run(source: Blob) {
    setStage("working");
    setError(null);
    setProgress(0);
    try {
      const text = await recognizeImage(source, (p) => setProgress(p.progress));
      setRawText(text);
      if (import.meta.env.DEV) console.log("[OCR] testo riconosciuto:\n" + text);
      const calls = parseTeamsHistory(text);
      const proposals = buildProposals(calls, {
        people,
        contacts,
        workHours,
        slotMinutes,
        today: new Date(),
      });
      setRows(
        proposals.map((p) => ({
          key: nanoid(),
          name: p.call.name,
          date: p.date,
          startMin: p.startMin,
          durationMin: p.call.durationMin,
          direction: p.call.direction,
          matchValue: matchValueOf(p.match),
        })),
      );
      setStage("review");
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
        const match = decodeMatch(r.matchValue, nameOf);
        const draft = proposalToDraft({
          call: {
            name: r.name.trim() || "Chiamata",
            direction: r.direction,
            dayLabel: null,
            durationMin: r.durationMin,
          },
          date: r.date,
          startMin: r.startMin,
          endMin: r.startMin + r.durationMin,
          match,
        });
        await saveEntry(applyDraft(draft, { id: nanoid(), now: Date.now() }));
      }
      notify(
        rows.length === 1
          ? "Attività creata"
          : `${rows.length} attività create`,
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
      title="Importa chiamate da Teams"
      description="Carica uno screenshot della cronologia chiamate: leggo persona, durata e giorno e ne abbozzo le attività."
      size="lg"
      footer={
        stage === "review" ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted">
              {rows.length === 0
                ? "Nessuna chiamata"
                : `${rows.length} ${rows.length === 1 ? "chiamata" : "chiamate"}`}
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
          aria-label="Screenshot cronologia chiamate"
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
            <p className="py-6 text-center text-sm text-muted">
              Non ho riconosciuto nessuna chiamata. Apri "Testo riconosciuto" qui
              sopra per vedere cosa ha letto l'OCR.
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
                        aria-label="Persona"
                        value={r.name}
                        onChange={(e) => patch(r.key, { name: e.target.value })}
                        className="w-full border-b border-line bg-transparent pb-1 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          aria-label="Giorno"
                          value={r.date}
                          onChange={(e) =>
                            patch(r.key, { date: e.target.value })
                          }
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
                        <span className="tnum inline-flex h-10 items-center rounded-lg border border-line px-2.5 text-xs text-muted">
                          {formatDuration(r.durationMin)}
                        </span>
                        {r.direction && (
                          <span className="inline-flex h-10 items-center text-xs text-faint">
                            {DIRECTION_LABEL[r.direction]}
                          </span>
                        )}
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
