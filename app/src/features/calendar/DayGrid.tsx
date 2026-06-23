import {
  buildSlots,
  fasciaEndLabel,
  lunchBoundary,
  minutesToLabel,
  type WorkHours,
} from "@/domain/slots";
import { LunchBand } from "@/features/calendar/LunchBand";

/** Altezza in px di uno slot: condivisa con DayView per posizionare i blocchi. */
export const SLOT_HEIGHT = 44;
/** Larghezza in px della colonna delle ore (gutter). */
export const TIME_GUTTER = 56;
/**
 * Respiro in fondo alla griglia: l'etichetta di fine giornata (es. 18:00) sta
 * *a cavallo* dell'ultima linea, quindi serve spazio sotto perché non venga
 * tagliata dall'`overflow-hidden`. Riservato in `useFitSlotHeight`.
 */
export const GRID_PAD_BOTTOM = 10;

interface DayGridProps {
  workHours: WorkHours;
  slotMinutes: number;
}

/**
 * Griglia oraria della vista Giorno: una riga per slot, con etichetta a sinistra.
 * Le righe sono `flex-1`: riempiono l'altezza disponibile così la giornata sta a
 * video senza scroll. Fra mattino e pomeriggio si interpone la striscia pausa
 * (altezza fissa): DayView riserva la stessa altezza in `useFitSlotHeight`, così
 * i blocchi assoluti combaciano. `min-h` evita righe illeggibili quando è densa.
 */
export function DayGrid({ workHours, slotMinutes }: DayGridProps) {
  const slots = buildSlots(workHours, slotMinutes).all;
  const boundary = lunchBoundary(workHours, slotMinutes);
  const lastIdx = slots.length - 1;
  return (
    <ul
      className="flex h-full flex-col border-b border-line"
      style={{ paddingBottom: GRID_PAD_BOTTOM }}
    >
      {slots.map((minutes, i) => {
        // Etichetta e linea solo ogni 30 min (leggibilità); i 15 min restano per
        // lo snapping dei blocchi, ma senza linea propria.
        const onHalf = minutes % 30 === 0;
        // La giornata *finisce* su un orario che non è inizio-slot (es. 18:00):
        // lo etichettiamo a cavallo della linea finale, come gli altri orari.
        const dayEnd = i === lastIdx ? fasciaEndLabel(i, minutes, boundary, lastIdx, workHours) : null;
        return (
          <li key={minutes} className="contents">
            {i === boundary && (
              <LunchBand>
                {/* 13:00 (fine mattino) a cavallo del bordo superiore della banda,
                    come il 14:00 sta sul bordo inferiore. */}
                <span
                  className="tnum absolute -top-2 left-0 pr-3 text-right font-mono text-xs text-muted"
                  style={{ width: TIME_GUTTER }}
                >
                  {minutesToLabel(workHours.morningEnd)}
                </span>
                {/* Spaziatore largo come il gutter ore: allinea "pausa" ai blocchi. */}
                <span className="shrink-0" style={{ width: TIME_GUTTER }} />
                <span className="pl-1 text-[11px] text-faint">pausa</span>
              </LunchBand>
            )}
            <div
              className={`relative flex min-h-[14px] flex-1 border-t ${
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
              {dayEnd !== null && (
                <span
                  className="tnum absolute bottom-0 left-0 translate-y-1/2 pr-3 text-right font-mono text-xs text-muted"
                  style={{ width: TIME_GUTTER }}
                >
                  {minutesToLabel(dayEnd)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
