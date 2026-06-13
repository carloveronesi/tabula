import { useRef, useState } from "react";
import { importExportFile, type ImportSummary } from "@/data/importExportFile";
import { collectExport } from "@/data/export/collectExport";
import { exportFilename } from "@/data/export/buildExport";
import { triggerDownload } from "@/data/export/triggerDownload";
import { viewRange } from "@/domain/calendarNav";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useInventoryStore } from "@/store/inventory";
import { useCalendarStore } from "@/store/calendar";
import { useToastStore } from "@/store/toast";
import { Button } from "@/ui";

const ROWS: { key: keyof ImportSummary; label: string }[] = [
  { key: "entries", label: "Attività" },
  { key: "clients", label: "Clienti" },
  { key: "projects", label: "Progetti" },
  { key: "people", label: "Persone" },
  { key: "contacts", label: "Contatti" },
  { key: "todos", label: "Todo" },
  { key: "days", label: "Giornate" },
];

/**
 * Impostazioni dell'app. Per ora ospita l'import dell'export: carica il file,
 * persiste su IndexedDB e ricarica gli store così le viste si popolano subito.
 */
export function SettingsView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadInventory = useInventoryStore((s) => s.loadInventory);
  const loadRange = useCalendarStore((s) => s.loadRange);
  const notify = useToastStore((s) => s.notify);

  async function onExport() {
    setExporting(true);
    try {
      const doc = await collectExport();
      triggerDownload(exportFilename(new Date()), JSON.stringify(doc, null, 2));
      notify(`Esportate ${doc.entries.length} attività`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto durante l'export.");
    } finally {
      setExporting(false);
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const text = await file.text();
      const result = await importExportFile(text);
      const { view, activeDate } = useUiStore.getState();
      const { from, to } = viewRange(activeDate, view);
      await Promise.all([loadSettings(), loadInventory(), loadRange(from, to)]);
      setSummary(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore imprevisto durante l'import.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Impostazioni</h2>
        <p className="mt-1 text-sm text-muted">
          Tutto resta sul tuo dispositivo: nessun dato lascia il browser.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-line bg-surface p-5">
        <div>
          <h3 className="font-medium text-ink">Importa dati</h3>
          <p className="mt-1 text-sm text-muted">
            Carica il file di export (.json). Un re-import aggiorna i record
            esistenti senza duplicarli.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="File di export"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Import in corso…" : "Scegli file…"}
        </Button>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {summary && (
          <div role="status" className="rounded border border-line bg-bg p-3">
            <p className="mb-2 text-sm font-medium text-ink">Import completato</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {ROWS.map((r) => (
                <div key={r.key} className="flex justify-between">
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="tnum text-ink">{summary[r.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-surface p-5">
        <div>
          <h3 className="font-medium text-ink">Esporta dati</h3>
          <p className="mt-1 text-sm text-muted">
            Scarica un backup completo (.json) di tutto l'archivio: attività,
            anagrafiche e impostazioni. Resta tutto sul tuo dispositivo.
          </p>
        </div>

        <Button variant="subtle" disabled={exporting} onClick={() => void onExport()}>
          {exporting ? "Export in corso…" : "Esporta backup…"}
        </Button>
      </section>
    </div>
  );
}
