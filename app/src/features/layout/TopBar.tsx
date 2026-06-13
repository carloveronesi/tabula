import { useUiStore, type ViewMode } from "@/store";
import { formatPeriod } from "@/domain/format";
import { Button, IconButton, Segmented, type SegmentedOption } from "@/ui";

const VIEWS: SegmentedOption<ViewMode>[] = [
  { id: "day", label: "Giorno" },
  { id: "week", label: "Settimana" },
  { id: "month", label: "Mese" },
  { id: "projects", label: "Progetti" },
  { id: "todo", label: "Todo" },
];

/**
 * Barra superiore: navigazione periodo (prec/oggi/succ) + intestazione serif del
 * periodo + switch vista. Costruita sui primitivi del design system.
 */
export function TopBar() {
  const view = useUiStore((s) => s.view);
  const activeDate = useUiStore((s) => s.activeDate);
  const goPrev = useUiStore((s) => s.goPrev);
  const goNext = useUiStore((s) => s.goNext);
  const goToday = useUiStore((s) => s.goToday);
  const setView = useUiStore((s) => s.setView);

  const period = formatPeriod(activeDate, view);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-bg px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          <IconButton label="Precedente" size="sm" onClick={goPrev}>
            ‹
          </IconButton>
          <Button variant="ghost" size="sm" onClick={goToday}>
            Oggi
          </Button>
          <IconButton label="Successivo" size="sm" onClick={goNext}>
            ›
          </IconButton>
        </div>
        <h1 className="font-serif text-xl text-ink tnum">{period || "Tabula"}</h1>
      </div>
      <Segmented options={VIEWS} value={view} onChange={setView} label="Vista" />
    </header>
  );
}
