import { useMemo, useState } from "react";
import type { Entry, Location } from "@/data/types";
import type { SummaryFilter } from "@/domain/monthlyReport";
import { dateTimeAt } from "@/domain/time";
import { entryColor } from "@/domain/colors";
import { isoDate, workingDatesOfMonth } from "@/domain/calendarNav";
import { dayBreakdown, entryLabel } from "@/domain/dayBreakdown";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { usePresenceStore } from "@/store/presence";
import { useEditorStore } from "@/store/editor";
import { useToastStore } from "@/store/toast";
import { Toaster } from "@/ui";
import { TopBar } from "@/features/layout/TopBar";
import { Sidebar } from "@/features/layout/Sidebar";
import { DayView } from "@/features/calendar/DayView";
import { DaySummary } from "@/features/calendar/DaySummary";
import { WeekGrid } from "@/features/calendar/WeekGrid";
import { MonthGrid } from "@/features/calendar/MonthGrid";
import { EntryEditor } from "@/features/calendar/EntryEditor";
import { EntryDetail } from "@/features/calendar/EntryDetail";
import { QuickAddPopover } from "@/features/calendar/QuickAddPopover";
import { TeamsImportModal } from "@/features/calendar/import/TeamsImportModal";
import { CalendarImportModal } from "@/features/calendar/import/CalendarImportModal";
import { useImportPreviewStore } from "@/features/calendar/import/importPreviewStore";
import { SettingsView } from "@/features/settings/SettingsView";
import { MonthSummary } from "@/features/summary/MonthSummary";
import { ProjectsView } from "@/features/projects/ProjectsView";
import { TodoView } from "@/features/todo/TodoView";
import { DayTodoWidget } from "@/features/todo/DayTodoWidget";
import { SearchView } from "@/features/search/SearchView";
import { useCalendarData } from "@/features/calendar/useCalendarData";
import { useTheme } from "@/features/layout/useTheme";
import { useKeyboardShortcuts } from "@/features/layout/useKeyboardShortcuts";
import { pasteEntry } from "@/features/layout/clipboardActions";
import {
  copyEntry,
  duplicateEntry,
  saveAsTemplate,
  deleteEntry,
} from "@/features/layout/entryActions";

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
  const clients = useInventoryStore((s) => s.clients);
  const locations = usePresenceStore((s) => s.metas);
  const setLocation = usePresenceStore((s) => s.setLocation);
  const saveEntry = useCalendarStore((s) => s.saveEntry);
  const undo = useCalendarStore((s) => s.undo);
  const notify = useToastStore((s) => s.notify);
  const showDetail = useEditorStore((s) => s.showDetail);
  const openQuickAdd = useEditorStore((s) => s.openQuickAdd);
  const openTeamsImport = useEditorStore((s) => s.openTeamsImport);
  const openCalendarImport = useEditorStore((s) => s.openCalendarImport);
  const calendarImportDay = useEditorStore((s) => s.calendarImportDay);
  const teamsImportDay = useEditorStore((s) => s.teamsImportDay);
  const clipboard = useEditorStore((s) => s.clipboard);
  const previewBlocks = useImportPreviewStore((s) => s.blocks);

  const canPaste = clipboard !== null;
  const pasteAt = (dateISO: string, startMin: number) =>
    void pasteEntry({ date: dateISO, startMin });

  // Filtro di evidenziazione del Riepilogo: hover transitorio o click "fissato".
  const [hoverFilter, setHoverFilter] = useState<SummaryFilter | null>(null);
  const [fixedFilter, setFixedFilter] = useState<SummaryFilter | null>(null);
  const monthFilter = hoverFilter ?? fixedFilter;

  // Sede effettiva per il Mese: i feriali non compilati prendono la predefinita
  // ("casa salvo eccezioni"); le sedi registrate hanno la precedenza.
  const monthLocations = useMemo<Record<string, Location>>(() => {
    if (!settings.presenceTracking.enabled) return locations;
    const todayISO = isoDate(new Date());
    const out: Record<string, Location> = {};
    for (const d of workingDatesOfMonth(
      activeDate,
      settings.workingDays,
      settings.patronDay,
    )) {
      // Solo i feriali già trascorsi prendono la predefinita; i futuri no.
      if (d <= todayISO) out[d] = settings.defaultLocation;
    }
    return { ...out, ...locations };
  }, [
    settings.presenceTracking.enabled,
    settings.defaultLocation,
    settings.workingDays,
    settings.patronDay,
    activeDate,
    locations,
  ]);

  const openDay = (date: Date) => {
    setActiveDate(date);
    setView("day");
  };

  const createRange = (
    dateISO: string,
    startMin: number,
    endMin: number,
    anchor?: { x: number; y: number },
  ) => openQuickAdd({ date: dateISO, startMin, endMin, anchor: anchor ?? null });

  // Colore del blocco per cliente/sottotipo (memoizzato sulle mappe colore).
  const colorOf = useMemo(() => {
    const maps = {
      clientColors: settings.clientColors,
      internalColors: settings.internalColors,
    };
    return (entry: Entry) => entryColor(entry, maps);
  }, [settings.clientColors, settings.internalColors]);

  // Resolver dei nomi cliente/sottotipo, condivisi da legenda e blocchi.
  const names = useMemo(() => {
    const subtypes = [...settings.subtypes.client, ...settings.subtypes.internal];
    return {
      clientName: (id: string) =>
        clients.find((c) => c.id === id)?.name ?? "Cliente",
      subtypeLabel: (id: string) =>
        subtypes.find((s) => s.id === id)?.label ?? "Interno",
    };
  }, [clients, settings.subtypes]);

  // Etichetta cliente/sottotipo del blocco (vista Giorno), accanto all'orario.
  const labelOf = useMemo(
    () => (entry: Entry) => entryLabel(entry, names),
    [names],
  );

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

  const isCalendar = view === "day" || view === "week" || view === "month";

  // Ripartizione della giornata attiva per il pannello-riepilogo (vista Giorno).
  const dayKey = isoDate(activeDate);
  // Import attivo: il pannello prende il posto del riepilogo a destra e i suoi
  // blocchi-anteprima compaiono sulla griglia (solo se è il giorno mostrato).
  const importActive = calendarImportDay !== null || teamsImportDay !== null;
  const breakdown = useMemo(() => {
    const dayEntries = entries.filter((e) => e.startsAt.slice(0, 10) === dayKey);
    return dayBreakdown(
      dayEntries,
      {
        clientColors: settings.clientColors,
        internalColors: settings.internalColors,
      },
      names,
    );
  }, [
    entries,
    dayKey,
    names,
    settings.clientColors,
    settings.internalColors,
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          data-testid={`view-${view}`}
          className={`mx-auto flex w-full min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5 ${
            view === "day" || view === "month" ? "max-w-6xl" : "max-w-5xl"
          }`}
        >
          {view === "day" ? (
            <div className="flex min-h-0 flex-1 gap-4">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-card sm:p-4">
                <DayView
                  date={activeDate}
                  entries={entries}
                  workHours={settings.workHours}
                  slotMinutes={settings.slotMinutes}
                  onSelectEntry={showDetail}
                  colorOf={colorOf}
                  labelOf={labelOf}
                  onCreateRange={createRange}
                  onUpdateEntry={updateEntryRange}
                  canPaste={canPaste}
                  onPasteAt={pasteAt}
                  onCopyEntry={copyEntry}
                  onDuplicateEntry={(e) => void duplicateEntry(e)}
                  onSaveTemplate={(e) => void saveAsTemplate(e)}
                  onDeleteEntry={(e) => void deleteEntry(e)}
                  previewBlocks={
                    (calendarImportDay ?? teamsImportDay) === dayKey
                      ? previewBlocks
                      : undefined
                  }
                />
              </div>
              {/* ponytail: il pannello vive nel ramo vista-Giorno; cambiando vista
                  mentre è aperto si perde lo stato della revisione. Caso raro
                  (l'import si avvia e si conclude in vista Giorno); spostare lo
                  stato in uno store se servirà conservarlo. */}
              {importActive ? (
                <>
                  <CalendarImportModal />
                  <TeamsImportModal />
                </>
              ) : (
                <DaySummary
                  breakdown={breakdown}
                  onAdd={(anchor) =>
                    openQuickAdd({
                      date: dayKey,
                      startMin: 540,
                      endMin: 600,
                      anchor: anchor ?? null,
                    })
                  }
                  onPaste={canPaste ? () => void pasteEntry() : undefined}
                  onImportCalls={() => openTeamsImport(dayKey)}
                  onImportCalendar={() => openCalendarImport(dayKey)}
                  presenceEnabled={settings.presenceTracking.enabled}
                  location={locations[dayKey] ?? null}
                  onSetLocation={(loc) => void setLocation(dayKey, loc)}
                  suggestedLocation={settings.defaultLocation}
                >
                  <DayTodoWidget onOpenTodo={() => setView("todo")} />
                </DaySummary>
              )}
            </div>
          ) : view === "month" ? (
            <div className="flex min-h-0 flex-1 gap-4">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-card sm:p-4">
                <MonthGrid
                  date={activeDate}
                  entries={entries}
                  onOpenDay={openDay}
                  colorOf={colorOf}
                  patronDay={settings.patronDay}
                  highlight={monthFilter}
                  locations={monthLocations}
                />
              </div>
              <MonthSummary
                activeFilter={monthFilter}
                fixedFilter={fixedFilter}
                onHoverFilter={setHoverFilter}
                onFixFilter={setFixedFilter}
              />
            </div>
          ) : (
          <div
            className={`flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-surface shadow-card ${
              isCalendar ? "overflow-hidden p-3 sm:p-4" : "overflow-auto p-4 sm:p-5"
            }`}
          >
            {view === "week" && (
          <WeekGrid
            date={activeDate}
            workingDays={settings.workingDays}
            workHours={settings.workHours}
            slotMinutes={settings.slotMinutes}
            entries={entries}
            onSelectEntry={showDetail}
            colorOf={colorOf}
            onCreateRange={createRange}
            onUpdateEntry={updateEntryRange}
            canPaste={canPaste}
            onPasteAt={pasteAt}
            onCopyEntry={copyEntry}
            onDuplicateEntry={(e) => void duplicateEntry(e)}
            onSaveTemplate={(e) => void saveAsTemplate(e)}
            onDeleteEntry={(e) => void deleteEntry(e)}
            presenceEnabled={settings.presenceTracking.enabled}
            locations={locations}
            onSetLocation={(date, loc) => void setLocation(date, loc)}
            suggestedLocation={settings.defaultLocation}
            patronDay={settings.patronDay}
          />
        )}
            {view === "projects" && <ProjectsView />}
            {view === "search" && <SearchView />}
            {view === "settings" && <SettingsView />}
            {view === "todo" && <TodoView />}
          </div>
          )}
        </main>
      </div>
      <EntryEditor />
      <EntryDetail />
      <QuickAddPopover />
      <Toaster />
    </div>
  );
}
