import type { DayBreakdown } from "@/domain/dayBreakdown";
import { formatHours } from "@/domain/format";
import { IconPlus } from "@/ui/icons";

interface DaySummaryProps {
  breakdown: DayBreakdown;
  /** Nuova attività in questa giornata. */
  onAdd: () => void;
}

/**
 * Pannello-riepilogo della giornata (a fianco della timeline nella vista
 * Giorno): tempo totale registrato, numero di attività e ripartizione per
 * cliente/sottotipo con gli stessi colori dei blocchi. Presentazionale: riceve
 * la ripartizione già calcolata. Nascosto sotto `lg` per dare spazio alla
 * timeline su schermi stretti.
 */
export function DaySummary({ breakdown, onAdd }: DaySummaryProps) {
  const { totalMin, count, rows } = breakdown;

  return (
    <aside className="hidden w-64 flex-none flex-col gap-3.5 lg:flex">
      <div className="rounded-lg border border-line bg-surface p-[18px] shadow-card">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-faint">
          Oggi registrato
        </div>
        <div className="tnum mt-2 text-[40px] font-bold leading-none tracking-tight text-ink">
          {formatHours(totalMin)}
        </div>
        <div className="mt-2 text-[12.5px] text-muted">
          {count === 0
            ? "Nessuna attività"
            : `${count} ${count === 1 ? "attività" : "attività"}`}
        </div>

        {rows.length > 0 && (
          <>
            <div className="my-4 h-px bg-line" />
            <ul className="flex flex-col gap-[11px]">
              {rows.map((r) => (
                <li key={r.key} className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`h-[9px] w-[9px] flex-none rounded-[3px] ${
                      r.color ? "" : "bg-accent"
                    }`}
                    style={r.color ? { backgroundColor: r.color } : undefined}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink/85">
                    {r.label}
                  </span>
                  <span className="tnum font-mono text-[11.5px] text-ink">
                    {formatHours(r.minutes)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent-wash/50 px-4 py-3.5 text-[12.5px] font-semibold text-accent transition-colors duration-[var(--dur-fast)] ease-out hover:bg-accent-wash"
      >
        <IconPlus size={15} />
        Aggiungi attività
      </button>
    </aside>
  );
}
