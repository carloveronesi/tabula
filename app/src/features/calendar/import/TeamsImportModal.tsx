import { nanoid } from "nanoid";
import type { ISODate } from "@/data/types";
import { applyDraft } from "@/domain/entryDraft";
import { parseTeamsHistory, type CallDirection } from "@/domain/teams/parseHistory";
import { buildProposals } from "@/domain/teams/placeCalls";
import { proposalToDraft } from "@/domain/teams/proposalDraft";
import { recognizeImage } from "@/data/ocr/recognizeImage";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { Combobox, TimeField } from "@/ui";
import { ImportModal, type ProcessResult } from "./ImportModal";
import { matchValueOf, useMatchHelpers } from "./importMatch";

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
  const match = useMatchHelpers();

  if (!day) return null;

  async function process(
    source: Blob,
    onProgress: (p: number) => void,
  ): Promise<ProcessResult<Row>> {
    const text = await recognizeImage(source, (p) => onProgress(p.progress));
    if (import.meta.env.DEV) console.log("[OCR] testo riconosciuto:\n" + text);
    const calls = parseTeamsHistory(text);
    const proposals = buildProposals(calls, {
      people,
      contacts,
      workHours,
      slotMinutes,
      today: new Date(),
    });
    return {
      kind: "rows",
      rawText: text,
      rows: proposals.map((p) => ({
        key: nanoid(),
        name: p.call.name,
        date: p.date,
        startMin: p.startMin,
        durationMin: p.call.durationMin,
        direction: p.call.direction,
        matchValue: matchValueOf(p.match),
      })),
    };
  }

  async function persist(rows: Row[]) {
    for (const r of rows) {
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
        match: match.decode(r.matchValue),
      });
      await saveEntry(applyDraft(draft, { id: nanoid(), now: Date.now() }));
    }
  }

  return (
    <ImportModal<Row>
      title="Importa chiamate da Teams"
      description="Carica uno screenshot della cronologia chiamate: leggo persona, durata e giorno e ne abbozzo le attività."
      fileLabel="Screenshot cronologia chiamate"
      noun={{ one: "chiamata", many: "chiamate", none: "Nessuna chiamata" }}
      emptyReview={
        'Non ho riconosciuto nessuna chiamata. Apri "Testo riconosciuto" qui sopra per vedere cosa ha letto l\'OCR.'
      }
      process={process}
      persist={persist}
      onClose={close}
      interval={(r) => ({
        date: r.date,
        startMin: r.startMin,
        endMin: r.startMin + r.durationMin,
      })}
      rowLabel={(r) => r.name}
      renderRow={(r, patch) => (
        <>
          <input
            aria-label="Persona"
            value={r.name}
            onChange={(e) => patch({ name: e.target.value })}
            className="w-full border-b border-line bg-transparent pb-1 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Giorno"
              value={r.date}
              onChange={(e) => patch({ date: e.target.value })}
              className="tnum h-10 rounded-lg border border-line bg-bg px-2.5 text-sm text-ink focus:border-primary focus:outline-none"
            />
            <div className="w-28">
              <TimeField
                label="Inizio"
                value={r.startMin}
                step={slotMinutes}
                onChange={(v) => patch({ startMin: v })}
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
