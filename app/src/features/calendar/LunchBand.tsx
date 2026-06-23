import type { ReactNode } from "react";
import { LUNCH_BAND } from "@/domain/dragGrid";

/**
 * Striscia "pausa pranzo": banda compatta e oscurata fra mattino e pomeriggio.
 * Altezza fissa (`LUNCH_BAND`), non interattiva (`pointer-events-none`): segnala
 * che la fascia non è assegnabile. Il contenuto (orario/etichetta) lo passa chi
 * la usa, perché gutter, vista Giorno e colonne Settimana mostrano cose diverse.
 */
export function LunchBand({ children }: { children?: ReactNode }) {
  return (
    <div
      aria-hidden
      data-testid="lunch-band"
      className="lunch-hatch pointer-events-none relative flex shrink-0 items-center border-y border-line"
      style={{ height: LUNCH_BAND }}
    >
      {children}
    </div>
  );
}
