import { useUiStore, type ViewMode } from "@/store";

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "day", label: "Giorno" },
  { id: "week", label: "Settimana" },
  { id: "month", label: "Mese" },
  { id: "projects", label: "Progetti" },
  { id: "todo", label: "Todo" },
];

/**
 * Barra superiore: navigazione data (prev/oggi/next) + switch vista.
 * Stile minimale: l'identità visiva arriva con il design system.
 */
export function TopBar() {
  const view = useUiStore((s) => s.view);
  const goPrev = useUiStore((s) => s.goPrev);
  const goNext = useUiStore((s) => s.goNext);
  const goToday = useUiStore((s) => s.goToday);
  const setView = useUiStore((s) => s.setView);

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Precedente" onClick={goPrev}>
          ‹
        </button>
        <button type="button" onClick={goToday}>
          Oggi
        </button>
        <button type="button" aria-label="Successivo" onClick={goNext}>
          ›
        </button>
      </div>
      <nav className="flex items-center gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
