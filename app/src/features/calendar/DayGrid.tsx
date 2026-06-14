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
 * Griglia oraria della vista Giorno: una riga per slot, con etichetta a sinistra.
 * Le righe sono `flex-1`: riempiono l'altezza disponibile così la giornata sta a
 * video senza scroll. DayView posiziona i blocchi con l'altezza-slot *misurata*
 * (vedi `useFitSlotHeight`); `min-h` evita righe illeggibili quando è densa.
 */
export function DayGrid({ workHours, slotMinutes }: DayGridProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  return (
    <ul className="flex h-full flex-col border-b border-line">
      {slots.map((minutes) => {
        // Etichetta e linea solo ogni 30 min (leggibilità); i 15 min restano per
        // lo snapping dei blocchi, ma senza linea propria.
        const onHalf = minutes % 30 === 0;
        return (
          <li
            key={minutes}
            className={`flex min-h-[14px] flex-1 border-t ${
              onHalf ? "border-line" : "border-transparent"
            }`}
          >
            <span
              className="tnum shrink-0 -translate-y-2 pr-3 text-right font-mono text-xs text-muted"
              style={{ width: TIME_GUTTER }}
            >
              {onHalf ? minutesToLabel(minutes) : ""}
            </span>
            <span className="flex-1" />
          </li>
        );
      })}
    </ul>
  );
}
