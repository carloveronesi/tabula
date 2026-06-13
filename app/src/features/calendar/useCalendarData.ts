import { useEffect } from "react";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { viewRange } from "@/domain/calendarNav";

/**
 * Effetto di caricamento dati dello shell: legge le impostazioni una volta al
 * mount e le entry del periodo mostrato ad ogni cambio di vista/data focale.
 * Mantiene le viste (presentazionali) disaccoppiate dal DB.
 */
export function useCalendarData(): void {
  const view = useUiStore((s) => s.view);
  const activeDate = useUiStore((s) => s.activeDate);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadRange = useCalendarStore((s) => s.loadRange);

  const { from, to } = viewRange(activeDate, view);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadRange(from, to);
  }, [loadRange, from, to]);
}
