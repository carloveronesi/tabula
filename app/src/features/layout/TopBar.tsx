import { useUiStore, type ViewMode } from "@/store";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { formatPeriod } from "@/domain/format";
import { isoDate } from "@/domain/calendarNav";
import { canRedo, canUndo } from "@/domain/history";
import { TimerControl } from "@/features/layout/TimerControl";
import { Button, IconButton, Segmented, type SegmentedOption } from "@/ui";
import {
  IconChevronLeft,
  IconChevronRight,
  IconUndo,
  IconRedo,
  IconPlus,
} from "@/ui/icons";

const CALENDAR_VIEWS: SegmentedOption<ViewMode>[] = [
  { id: "day", label: "Giorno" },
  { id: "week", label: "Settimana" },
  { id: "month", label: "Mese" },
];

const SECTION_LABEL: Partial<Record<ViewMode, string>> = {
  projects: "Progetti",
  todo: "Todo",
  search: "Ricerca",
  settings: "Impostazioni",
};

const isCalendar = (v: ViewMode): boolean =>
  v === "day" || v === "week" || v === "month";

/**
 * Toolbar del calendario: navigazione del periodo (prec/oggi/succ), titolo del
 * periodo, switch giorno/settimana/mese, storia (annulla/ripeti) e nuova
 * attività. Per le viste non-calendario mostra solo il titolo della sezione.
 * La navigazione tra sezioni vive nella Sidebar.
 */
export function TopBar() {
  const view = useUiStore((s) => s.view);
  const activeDate = useUiStore((s) => s.activeDate);
  const goPrev = useUiStore((s) => s.goPrev);
  const goNext = useUiStore((s) => s.goNext);
  const goToday = useUiStore((s) => s.goToday);
  const setView = useUiStore((s) => s.setView);
  const openCreate = useEditorStore((s) => s.openCreate);
  const history = useCalendarStore((s) => s.history);
  const undo = useCalendarStore((s) => s.undo);
  const redo = useCalendarStore((s) => s.redo);

  const calendar = isCalendar(view);
  const period = formatPeriod(activeDate, view);

  const newEntry = () =>
    openCreate({ date: isoDate(activeDate), startMin: 540, endMin: 600 });

  return (
    <header className="sticky top-0 z-sticky flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        {calendar && (
          <div className="flex items-center gap-1 rounded-pill border border-line bg-surface p-1 shadow-sm">
            <IconButton label="Precedente" size="sm" onClick={goPrev}>
              <IconChevronLeft size={18} />
            </IconButton>
            <Button variant="ghost" size="sm" className="px-3" onClick={goToday}>
              Oggi
            </Button>
            <IconButton label="Successivo" size="sm" onClick={goNext}>
              <IconChevronRight size={18} />
            </IconButton>
          </div>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-ink tnum sm:text-2xl">
          {calendar ? period || "Tabula" : (SECTION_LABEL[view] ?? "Tabula")}
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        <TimerControl />
        <div className="flex items-center gap-0.5">
          <IconButton
            label="Annulla"
            title="Annulla (Ctrl+Z)"
            size="sm"
            disabled={!canUndo(history)}
            onClick={() => void undo()}
          >
            <IconUndo size={18} />
          </IconButton>
          <IconButton
            label="Ripeti"
            title="Ripeti (Ctrl+Shift+Z)"
            size="sm"
            disabled={!canRedo(history)}
            onClick={() => void redo()}
          >
            <IconRedo size={18} />
          </IconButton>
        </div>
        {calendar && (
          <Segmented
            options={CALENDAR_VIEWS}
            value={view}
            onChange={setView}
            label="Vista"
          />
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={newEntry}
          title="Nuova attività (n)"
        >
          <IconPlus size={16} />
          Nuova
        </Button>
      </div>
    </header>
  );
}
