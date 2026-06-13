import type { Entry } from "@/data/types";
import { dateTimeAt } from "@/domain/time";
import { useUiStore, type ViewMode } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useEditorStore } from "@/store/editor";
import { TopBar } from "@/features/layout/TopBar";
import { DayView } from "@/features/calendar/DayView";
import { WeekGrid } from "@/features/calendar/WeekGrid";
import { MonthGrid } from "@/features/calendar/MonthGrid";
import { EntryEditor } from "@/features/calendar/EntryEditor";
import { EntryDetail } from "@/features/calendar/EntryDetail";
import { SettingsView } from "@/features/settings/SettingsView";
import { SummaryView } from "@/features/summary/SummaryView";
import { useCalendarData } from "@/features/calendar/useCalendarData";
import { useTheme } from "@/features/layout/useTheme";

const VIEW_LABEL: Record<ViewMode, string> = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
  riepilogo: "Riepilogo",
  projects: "Progetti",
  todo: "Todo",
  settings: "Impostazioni",
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
  const setView = useUiStore((s) => s.setView);
  const setActiveDate = useUiStore((s) => s.setActiveDate);
  const settings = useSettingsStore((s) => s.settings);
  const entries = useCalendarStore((s) => s.entries);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const showDetail = useEditorStore((s) => s.showDetail);
  const openCreate = useEditorStore((s) => s.openCreate);

  const openDay = (date: Date) => {
    setActiveDate(date);
    setView("day");
  };

  const createRange = (dateISO: string, startMin: number, endMin: number) =>
    openCreate({ date: dateISO, startMin, endMin });

  const updateEntryRange = (
    entry: Entry,
    dateISO: string,
    startMin: number,
    endMin: number,
  ) => {
    void saveEntry({
      ...entry,
      startsAt: dateTimeAt(dateISO, startMin),
      endsAt: dateTimeAt(dateISO, endMin),
      updatedAt: Date.now(),
    });
  };

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
            onSelectEntry={showDetail}
            onCreateRange={createRange}
            onUpdateEntry={updateEntryRange}
          />
        )}
        {view === "week" && (
          <WeekGrid
            date={activeDate}
            workingDays={settings.workingDays}
            workHours={settings.workHours}
            slotMinutes={settings.slotMinutes}
            entries={entries}
            onSelectEntry={showDetail}
            onCreateRange={createRange}
            onUpdateEntry={updateEntryRange}
          />
        )}
        {view === "month" && (
          <MonthGrid date={activeDate} entries={entries} onOpenDay={openDay} />
        )}
        {view === "riepilogo" && <SummaryView />}
        {view === "settings" && <SettingsView />}
        {(view === "projects" || view === "todo") && (
          <p className="text-sm text-muted">{VIEW_LABEL[view]}</p>
        )}
      </main>
      <EntryEditor />
      <EntryDetail />
    </div>
  );
}
