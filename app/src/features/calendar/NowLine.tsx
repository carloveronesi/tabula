import { nowRowOffset } from "@/domain/nowLine";
import { useNowMinute } from "@/features/calendar/useNowMinute";

interface NowLineProps {
  /** Slot-start in minuti (stessa lista della griglia). */
  slots: number[];
  slotMinutes: number;
  /** Altezza in px di una riga-slot (misurata). */
  slotHeight: number;
  /** Mostra il pallino a sinistra (vista Giorno). */
  withDot?: boolean;
}

/**
 * Linea orizzontale dell'ora corrente, stile Teams: si posiziona sulla griglia
 * in base all'ora e si aggiorna ogni minuto. Non si disegna se l'ora è fuori
 * dall'orario mostrato o nella pausa. Va dentro un contenitore `relative`.
 */
export function NowLine({ slots, slotMinutes, slotHeight, withDot }: NowLineProps) {
  const nowMin = useNowMinute();
  const offset = nowRowOffset(slots, slotMinutes, nowMin);
  if (offset === null) return null;

  return (
    <div
      data-testid="now-line"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
      style={{ top: offset * slotHeight }}
    >
      {withDot && (
        <span className="-ml-1.5 h-3 w-3 shrink-0 rounded-pill bg-now shadow-sm ring-2 ring-surface" />
      )}
      <span className="h-0.5 flex-1 rounded-pill bg-now" />
    </div>
  );
}
