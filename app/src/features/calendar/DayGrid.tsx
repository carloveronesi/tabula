import { buildSlots, minutesToLabel, type WorkHours } from "@/domain/slots";

interface DayGridProps {
  workHours: WorkHours;
  slotMinutes: number;
}

/**
 * Griglia oraria della vista Giorno: una riga per slot lavorativo con etichetta.
 * Presentazionale; gli eventi/blocchi verranno sovrapposti in seguito.
 */
export function DayGrid({ workHours, slotMinutes }: DayGridProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  return (
    <ul className="divide-y divide-line">
      {slots.map((minutes) => (
        <li key={minutes} className="flex items-start gap-3 py-1">
          <span className="tnum w-12 shrink-0 font-mono text-xs text-muted">
            {minutesToLabel(minutes)}
          </span>
          <span className="flex-1" />
        </li>
      ))}
    </ul>
  );
}
