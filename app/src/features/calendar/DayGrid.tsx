import { buildSlots, minutesToLabel, type WorkHours } from "@/domain/slots";

/** Altezza in px di uno slot: condivisa con DayView per posizionare i blocchi. */
export const SLOT_HEIGHT = 44;
/** Larghezza in px della colonna delle ore (gutter). */
export const TIME_GUTTER = 56;

interface DayGridProps {
  workHours: WorkHours;
  slotMinutes: number;
}

/**
 * Griglia oraria della vista Giorno: una riga ad altezza fissa per slot, con
 * etichetta a sinistra. Le coordinate (SLOT_HEIGHT, TIME_GUTTER) sono il sistema
 * di riferimento su cui DayView posiziona i blocchi-evento.
 */
export function DayGrid({ workHours, slotMinutes }: DayGridProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  return (
    <ul className="border-b border-line">
      {slots.map((minutes) => (
        <li
          key={minutes}
          className="flex border-t border-line"
          style={{ height: SLOT_HEIGHT }}
        >
          <span
            className="tnum shrink-0 -translate-y-2 pr-3 text-right font-mono text-xs text-muted"
            style={{ width: TIME_GUTTER }}
          >
            {minutesToLabel(minutes)}
          </span>
          <span className="flex-1" />
        </li>
      ))}
    </ul>
  );
}
