import { useEffect } from "react";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { useTemplateStore } from "@/store/templates";
import { useTimerStore } from "@/store/timer";
import { usePresenceStore } from "@/store/presence";
import { useTodoStore } from "@/store/todo";
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
  const loadTemplates = useTemplateStore((s) => s.loadTemplates);
  const loadTimer = useTimerStore((s) => s.load);
  const loadRange = useCalendarStore((s) => s.loadRange);
  const loadPresence = usePresenceStore((s) => s.loadRange);
  const loadTodos = useTodoStore((s) => s.loadTodos);

  const { from, to } = viewRange(activeDate, view);

  useEffect(() => {
    void loadSettings();
    void loadInventory();
    void loadTemplates();
    void loadTimer();
    void loadTodos();
  }, [loadSettings, loadInventory, loadTemplates, loadTimer, loadTodos]);

  useEffect(() => {
    void loadRange(from, to);
    void loadPresence(from.slice(0, 10), to.slice(0, 10));
  }, [loadRange, loadPresence, from, to]);
}
