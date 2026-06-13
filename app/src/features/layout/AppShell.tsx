import { useUiStore, type ViewMode } from "@/store";
import { TopBar } from "@/features/layout/TopBar";

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
  const view = useUiStore((s) => s.view);
  return (
    <div className="min-h-screen bg-[var(--si-bg)] text-[var(--si-ink)]">
      <TopBar />
      <main data-testid={`view-${view}`} className="p-4">
        <p className="text-sm text-[var(--si-gray)]">{VIEW_LABEL[view]}</p>
      </main>
    </div>
  );
}
