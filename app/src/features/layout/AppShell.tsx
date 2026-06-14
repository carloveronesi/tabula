import type { Entry } from "@/data/types";
import { dateTimeAt } from "@/domain/time";
import { useUiStore, type ViewMode } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useEditorStore } from "@/store/editor";
import { useToastStore } from "@/store/toast";
import { Toaster } from "@/ui";
import { TopBar } from "@/features/layout/TopBar";
import { Sidebar } from "@/features/layout/Sidebar";
import { DayView } from "@/features/calendar/DayView";
import { WeekGrid } from "@/features/calendar/WeekGrid";
import { MonthGrid } from "@/features/calendar/MonthGrid";
import { EntryEditor } from "@/features/calendar/EntryEditor";
import { EntryDetail } from "@/features/calendar/EntryDetail";
import { SettingsView } from "@/features/settings/SettingsView";
import { SummaryView } from "@/features/summary/SummaryView";
import { ProjectsView } from "@/features/projects/ProjectsView";
import { TodoView } from "@/features/todo/TodoView";
import { SearchView } from "@/features/search/SearchView";
import { useCalendarData } from "@/features/calendar/useCalendarData";
import { useTheme } from "@/features/layout/useTheme";
import { useKeyboardShortcuts } from "@/features/layout/useKeyboardShortcuts";

const VIEW_LABEL: Record<ViewMode, string> = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
  riepilogo: "Riepilogo",
  projects: "Progetti",
  todo: "Todo",
  search: "Ricerca",
  settings: "Impostazioni",
};

/**
 * Shell dell'app: barra superiore + area contenuto instradata sulla vista.
 * Le viste vere sostituiranno i placeholder man mano.
 */
export function AppShell() {
  useTheme();
  useCalendarData();
  useKeyboardShortcuts();
  const view = useUiStore((s) => s.view);
  const activeDate = useUiStore((s) => s.activeDate);
  const setView = useUiStore((s) => s.setView);
  const setActiveDate = useUiStore((s) => s.setActiveDate);
  const settings = useSettingsStore((s) => s.settings);
  const entries = useCalendarStore((s) => s.entries);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const undo = useCalendarStore((s) => s.undo);
  const notify = useToastStore((s) => s.notify);
  const showDetail = useEditorStore((s) => s.showDetail);
  const openCreate = useEditorStore((s) => s.openCreate);

  const openDay = (date: Date) => {
    setActiveDate(date);
    setView("day");
  };

  const createRange = (dateISO: string, startMin: number, endMin: number) =>
    openCreate({ date: dateISO, startMin, endMin });

  const updateEntryRange = async (
    entry: Entry,
    dateISO: string,
    startMin: number,
    endMin: number,
  ) => {
    await saveEntry({
      ...entry,
      startsAt: dateTimeAt(dateISO, startMin),
      endsAt: dateTimeAt(dateISO, endMin),
      updatedAt: Date.now(),
    });
    notify("Attività spostata", {
      action: { label: "Annulla", run: () => void undo() },
    });
  };

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          data-testid={`view-${view}`}
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-6"
        >
          <div className="rounded-xl border border-line bg-surface p-3 shadow-card sm:p-5">
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
            {view === "projects" && <ProjectsView />}
            {view === "search" && <SearchView />}
            {view === "settings" && <SettingsView />}
            {view === "todo" && <TodoView />}
          </div>
        </main>
      </div>
      <EntryEditor />
      <EntryDetail />
      <Toaster />
    </div>
  );
}
