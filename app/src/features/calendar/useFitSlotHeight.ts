import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { SLOT_HEIGHT } from "@/features/calendar/DayGrid";

/** Altezza minima utile di uno slot (coerente col `min-h` delle righe griglia). */
const MIN_SLOT_HEIGHT = 14;

/**
 * Altezza-slot *misurata* per la matematica di blocchi e drag: lo spazio
 * verticale disponibile (meno la striscia pausa, `reserve`) diviso per
 * `slotCount`. Il riempimento visivo lo fa la griglia stessa con righe `flex-1`;
 * qui ricaviamo l'altezza reale di una riga così i blocchi assoluti combaciano.
 * Segue il resize via `ResizeObserver`; senza (jsdom) resta `SLOT_HEIGHT`,
 * mantenendo coerenti i test di drag.
 */
export function useFitSlotHeight<T extends HTMLElement>(
  slotCount: number,
  reserve = 0,
): {
  ref: RefObject<T>;
  slotHeight: number;
} {
  const ref = useRef<T>(null);
  const [slotHeight, setSlotHeight] = useState(SLOT_HEIGHT);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined" || slotCount <= 0) return;

    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) {
        setSlotHeight(Math.max(MIN_SLOT_HEIGHT, (h - reserve) / slotCount));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slotCount, reserve]);

  return { ref, slotHeight };
}
