import { collectExport } from "@/data/export/collectExport";
import { exportFilename } from "@/data/export/buildExport";
import { triggerDownload } from "@/data/export/triggerDownload";
import { useSettingsStore } from "@/store/settings";

// ponytail: intervallo fisso a 14 giorni; renderlo un'impostazione se qualcuno lo chiede.
const BACKUP_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

/** Scarica un backup completo (.json) e registra la data. Restituisce il n. di attività. */
export async function runBackup(): Promise<number> {
  const doc = await collectExport();
  triggerDownload(exportFilename(new Date()), JSON.stringify(doc, null, 2));
  const { settings, saveSettings } = useSettingsStore.getState();
  await saveSettings({ ...settings, lastBackupAt: Date.now() });
  return doc.entries.length;
}

/** Vero se non c'è mai stato un backup o l'ultimo è più vecchio dell'intervallo. */
export function isBackupOverdue(
  lastBackupAt: number | undefined,
  now = Date.now(),
): boolean {
  return now - (lastBackupAt ?? 0) > BACKUP_INTERVAL_MS;
}
