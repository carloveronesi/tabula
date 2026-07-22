import type { ReactNode } from "react";
import type { DayBreakdown } from "@/domain/dayBreakdown";
import type { Location } from "@/data/types";
import { formatHours } from "@/domain/format";
import { Button } from "@/ui/Button";
import { IconPlus, IconUsers, IconCalendar } from "@/ui/icons";
import { DayLocationPicker } from "@/features/calendar/DayLocationPicker";

interface DaySummaryProps {
  breakdown: DayBreakdown;
  /** Nuova attività in questa giornata; `anchor` ancora il quick-add al bottone. */
  onAdd: (anchor?: { x: number; y: number }) => void;
  /** Incolla l'attività copiata in questa giornata; assente se appunti vuoti. */
  onPaste?: () => void;
  /** Apre l'import delle chiamate Teams da screenshot per questa giornata. */
  onImportCalls?: () => void;
  /** Apre l'import dei meeting da screenshot del calendario per questa giornata. */
  onImportCalendar?: () => void;
  /** Minuti attesi del giorno (giornata piena feriale meno ferie); 0 = non
   * feriale/festivo → niente barra capacità. */
  expectedMin?: number;
  /** Mostra il selettore della sede (tracciamento presenze attivo). */
  presenceEnabled?: boolean;
  location?: Location | null;
  onSetLocation?: (location: Location | null) => void;
  /** Sede predefinita, suggerita quando il giorno non ha sede. */
  suggestedLocation?: Location | null;
  /** Contenuto extra in coda alla sidebar (es. widget Da fare). */
  children?: ReactNode;
}

/**
 * Pannello-riepilogo della giornata (a fianco della timeline nella vista
 * Giorno): tempo totale registrato, numero di attività e ripartizione per
 * cliente/sottotipo con gli stessi colori dei blocchi. Presentazionale: riceve
 * la ripartizione già calcolata. Nascosto sotto `lg` per dare spazio alla
 * timeline su schermi stretti.
 */
export function DaySummary({
  breakdown,
  onAdd,
  onPaste,
  onImportCalls,
  onImportCalendar,
  expectedMin = 0,
  presenceEnabled = false,
  location = null,
  onSetLocation,
  suggestedLocation = null,
  children,
}: DaySummaryProps) {
  const { totalMin, count, rows } = breakdown;

  return (
    <aside className="hidden w-64 min-h-0 flex-none flex-col gap-3.5 overflow-y-auto lg:flex">
      <div className="rounded-lg border border-line bg-surface p-[18px] shadow-card">
        <div className="text-[13px] font-medium text-muted">Oggi registrato</div>
        <div className="tnum mt-1 text-2xl font-semibold leading-tight tracking-tight text-ink">
          {formatHours(totalMin)}
        </div>

        {expectedMin > 0 ? (
          <>
            {totalMin < expectedMin ? (
              <div className="mt-1 text-[13px] font-medium text-muted">
                Mancano{" "}
                <span className="tnum text-ink">
                  {formatHours(expectedMin - totalMin)}
                </span>
              </div>
            ) : (
              <div className="mt-1 text-[13px] font-medium text-accent">
                Giornata completa
              </div>
            )}
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-line">
              <div
                className="h-full rounded-pill bg-accent"
                style={{ width: `${Math.min(100, (totalMin / expectedMin) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11.5px] text-faint">
              <span className="tnum text-muted">{formatHours(totalMin)}</span> su{" "}
              <span className="tnum text-muted">{formatHours(expectedMin)}</span>
              {count > 0 && ` · ${count} ${count === 1 ? "attività" : "attività"}`}
            </div>
          </>
        ) : (
          <div className="mt-1 text-[12.5px] text-muted">
            {count === 0 ? "Nessuna attività" : `${count} attività`}
          </div>
        )}

        {presenceEnabled && onSetLocation && (
          <>
            <div className="my-4 h-px bg-line" />
            <div className="text-[13px] font-medium text-muted">Sede</div>
            <div className="mt-2">
              <DayLocationPicker
                value={location}
                onChange={onSetLocation}
                suggested={suggestedLocation}
              />
            </div>
          </>
        )}

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
                  <span className="tnum text-[11.5px] text-ink">
                    {formatHours(r.minutes)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Button
        variant="primary"
        className="w-full"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onAdd({ x: r.left, y: r.top + r.height / 2 });
        }}
      >
        <IconPlus size={16} />
        Aggiungi attività
      </Button>

      {onPaste && (
        <Button variant="ghost" size="sm" className="-mt-1 w-full" onClick={onPaste}>
          Incolla attività
        </Button>
      )}

      {(onImportCalls || onImportCalendar) && (
        <div className="flex flex-col gap-2">
          {onImportCalls && (
            <Button variant="subtle" size="sm" className="w-full justify-start" onClick={onImportCalls}>
              <IconUsers size={15} className="text-muted" />
              Importa chiamate…
            </Button>
          )}
          {onImportCalendar && (
            <Button variant="subtle" size="sm" className="w-full justify-start" onClick={onImportCalendar}>
              <IconCalendar size={15} className="text-muted" />
              Importa dal calendario…
            </Button>
          )}
        </div>
      )}

      {children}
    </aside>
  );
}
