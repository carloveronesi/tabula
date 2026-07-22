import { useEffect } from "react";
import { db } from "@/data/db";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toast";
import { isBackupOverdue, runBackup } from "@/features/settings/backup";

/**
 * Alla partenza, se l'ultimo backup è vecchio (o mai fatto) e c'è qualcosa da
 * perdere, un promemoria gentile con azione diretta. Le impostazioni sono già
 * caricate prima del primo render (vedi main.tsx), quindi niente falso allarme.
 */
export function useBackupReminder(): void {
  const lastBackupAt = useSettingsStore((s) => s.settings.lastBackupAt);
  const notify = useToastStore((s) => s.notify);

  useEffect(() => {
    if (!isBackupOverdue(lastBackupAt)) return;
    let cancelled = false;
    void db.entries.count().then((n) => {
      if (cancelled || n === 0) return;
      notify("È da un po' che non salvi un backup.", {
        action: { label: "Esporta ora", run: () => void runBackup() },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [lastBackupAt, notify]);
}
