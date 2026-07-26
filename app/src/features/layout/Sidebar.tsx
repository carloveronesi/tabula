import { useState, type ComponentType } from "react";
import { useUiStore, type ViewMode } from "@/store";
import { cn } from "@/ui/cn";
import {
  IconCalendar,
  IconProjects,
  IconTodo,
  IconSearch,
  IconSettings,
  IconHelp,
} from "@/ui/icons";
import { HelpModal } from "@/features/help/HelpModal";

type Dest = {
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** Vista raggiunta al click. */
  target: ViewMode;
  /** Viste per cui la voce risulta attiva (default: solo `target`). */
  match?: ViewMode[];
};

// Il mese è una scala del calendario, non una sezione: niente voce "Riepilogo"
// che aprirebbe la stessa vista con un altro nome, e "Calendario" resta attivo
// anche su `month` (ci si arriva dallo switch Giorno/Settimana/Mese in TopBar).
const PRIMARY: Dest[] = [
  { label: "Calendario", icon: IconCalendar, target: "day", match: ["day", "week", "month"] },
  { label: "Progetti", icon: IconProjects, target: "projects" },
  { label: "Todo", icon: IconTodo, target: "todo" },
];

const SECONDARY: Dest[] = [
  { label: "Ricerca", icon: IconSearch, target: "search" },
  { label: "Impostazioni", icon: IconSettings, target: "settings" },
];

const itemClass = (active: boolean) =>
  cn(
    "group relative flex w-full flex-col items-center gap-1 rounded-xl py-2.5",
    "text-[11px] font-medium tracking-tight",
    "transition-[background-color,color] duration-[var(--dur-fast)] ease-out",
    active
      ? "bg-primary-wash text-primary"
      : "text-muted hover:bg-raised hover:text-ink",
  );

function NavItem({ dest, active, onSelect }: { dest: Dest; active: boolean; onSelect: () => void }) {
  const Icon = dest.icon;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      title={dest.label}
      className={itemClass(active)}
    >
      {/* indicatore attivo a filo del bordo sinistro del rail */}
      <span
        aria-hidden
        className={cn(
          "absolute left-[-10px] top-1/2 h-6 w-1 -translate-y-1/2 rounded-pill bg-primary",
          "transition-opacity duration-[var(--dur-fast)]",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon size={21} />
      <span className="leading-none">{dest.label}</span>
    </button>
  );
}

/**
 * Rail di navigazione verticale: sezioni primarie in alto, ricerca/impostazioni
 * in basso. Ogni voce porta icona + etichetta (testo visibile, `aria-pressed`
 * sulla voce attiva). Lo switch giorno/settimana/mese resta nella TopBar.
 */
export function Sidebar() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const [help, setHelp] = useState(false);

  const isActive = (d: Dest) =>
    d.match ? d.match.includes(view) : view === d.target;

  return (
    <nav
      aria-label="Sezioni"
      className="sticky top-0 flex h-screen w-[82px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface px-3 py-[18px]"
    >
      <img
        src={`${import.meta.env.BASE_URL}tabula-mark.svg`}
        alt="Tabula"
        width={34}
        height={34}
        className="mb-2 shrink-0"
      />
      <div className="flex w-full flex-1 flex-col gap-1">
        {PRIMARY.map((d) => (
          <NavItem key={d.label} dest={d} active={isActive(d)} onSelect={() => setView(d.target)} />
        ))}
      </div>
      <div className="flex w-full flex-col gap-1">
        {/* L'aiuto non è una vista: apre un pannello e ti lascia dov'eri. */}
        <button
          type="button"
          onClick={() => setHelp(true)}
          title="Come funziona"
          className={itemClass(false)}
        >
          <IconHelp size={21} />
          <span className="leading-none">Aiuto</span>
        </button>
        {SECONDARY.map((d) => (
          <NavItem key={d.label} dest={d} active={isActive(d)} onSelect={() => setView(d.target)} />
        ))}
      </div>
      <HelpModal open={help} onClose={() => setHelp(false)} />
    </nav>
  );
}
