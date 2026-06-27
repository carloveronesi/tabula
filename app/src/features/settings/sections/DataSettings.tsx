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
import { useInstallPrompt } from "@/pwa/useInstallPrompt";
import { Button } from "@/ui";
import { SettingsSection } from "@/features/settings/SettingsSection";

const ROWS: { key: keyof ImportSummary; label: string }[] = [
  { key: "entries", label: "Attività" },
  { key: "clients", label: "Clienti" },
  { key: "projects", label: "Progetti" },
  { key: "people", label: "Persone" },
  { key: "contacts", label: "Contatti" },
  { key: "todos", label: "Todo" },
  { key: "days", label: "Giornate" },
];

/** Import ed export dell'archivio (backup locale). */
export function DataSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadInventory = useInventoryStore((s) => s.loadInventory);
  const loadRange = useCalendarStore((s) => s.loadRange);
  const notify = useToastStore((s) => s.notify);
  const { canInstall, install } = useInstallPrompt();

  async function onExport() {
    setExporting(true);
    try {
      const doc = await collectExport();
      triggerDownload(exportFilename(new Date()), JSON.stringify(doc, null, 2));
      notify(`Esportate ${doc.entries.length} attività`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Errore imprevisto durante l'export.",
      );
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
      setError(
        e instanceof Error ? e.message : "Errore imprevisto durante l'import.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Importa dati"
        description="Carica un backup di Tabula o un vecchio file di export (.json). Un re-import aggiorna i record esistenti senza duplicarli."
      >
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
      </SettingsSection>

      <SettingsSection
        title="Esporta dati"
        description="Scarica un backup completo (.json) di tutto l'archivio: attività, anagrafiche e impostazioni. Resta tutto sul tuo dispositivo."
      >
        <Button
          variant="subtle"
          disabled={exporting}
          onClick={() => void onExport()}
        >
          {exporting ? "Export in corso…" : "Esporta backup…"}
        </Button>
      </SettingsSection>

      {canInstall && (
        <SettingsSection
          title="Installa app"
          description="Installa Tabula come app sul tuo dispositivo per aprirla dalla home e usarla offline."
        >
          <Button variant="subtle" onClick={install}>
            Installa Tabula
          </Button>
        </SettingsSection>
      )}
    </div>
  );
}
