import { useUiStore, type ViewMode } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { TopBar } from "@/features/layout/TopBar";
import { DayView } from "@/features/calendar/DayView";
import { WeekGrid } from "@/features/calendar/WeekGrid";
import { MonthGrid } from "@/features/calendar/MonthGrid";
import { useCalendarData } from "@/features/calendar/useCalendarData";
import { useTheme } from "@/features/layout/useTheme";

const VIEW_LABEL: Record<ViewMode, string> = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
  projects: "Progetti",
  todo: "Todo",
};

/**
 * Shell dell'app: barra superiore + area contenuto instradata sulla vista.
 * Le viste vere sostituiranno i placeholder man mano.
 */
export function AppShell() {
  useTheme();
  useCalendarData();
  const view = useUiStore((s) => s.view);
  const activeDate = useUiStore((s) => s.activeDate);
  const settings = useSettingsStore((s) => s.settings);
  const entries = useCalendarStore((s) => s.entries);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <TopBar />
      <main data-testid={`view-${view}`} className="mx-auto max-w-5xl p-4 sm:p-6">
        {view === "day" && (
          <DayView
            date={activeDate}
            entries={entries}
            workHours={settings.workHours}
            slotMinutes={settings.slotMinutes}
          />
        )}
        {view === "week" && (
          <WeekGrid
            date={activeDate}
            workingDays={settings.workingDays}
            workHours={settings.workHours}
            slotMinutes={settings.slotMinutes}
          />
        )}
        {view === "month" && <MonthGrid date={activeDate} />}
        {(view === "projects" || view === "todo") && (
          <p className="text-sm text-muted">{VIEW_LABEL[view]}</p>
        )}
      </main>
    </div>
  );
}
