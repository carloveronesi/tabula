import { useEffect } from "react";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { viewRange } from "@/domain/calendarNav";

/**
 * Effetto di caricamento dati dello shell: legge impostazioni e anagrafiche una
 * volta al mount, e le entry del periodo mostrato ad ogni cambio di vista/data.
 * Mantiene le viste (presentazionali) disaccoppiate dal DB.
 */
export function useCalendarData(): void {
  const view = useUiStore((s) => s.view);
  const activeDate = useUiStore((s) => s.activeDate);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadInventory = useInventoryStore((s) => s.loadInventory);
  const loadRange = useCalendarStore((s) => s.loadRange);

  const { from, to } = viewRange(activeDate, view);

  useEffect(() => {
    void loadSettings();
    void loadInventory();
  }, [loadSettings, loadInventory]);

  useEffect(() => {
    void loadRange(from, to);
  }, [loadRange, from, to]);
}
