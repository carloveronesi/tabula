import type { SourceEntry } from "@/data/import/sourceTypes";
import { sameEntry } from "@/data/import/entryEquals";

/** Un'entry occupa un intervallo continuo [startMin, endMin) in minuti dalla mezzanotte. */
export interface SlotRange {
  startMin: number;
  endMin: number;
  entry: SourceEntry;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Ricompone la mappa `hours` (una copia per slot) in range continui.
 * Due slot si fondono solo se sono adiacenti (nessun buco) e l'entry è identica.
 */
export function mergeConsecutiveSlots(
  hours: Record<string, SourceEntry>,
  slotMinutes = 30,
): SlotRange[] {
  const slots = Object.keys(hours)
    .map((key) => ({ min: toMinutes(key), entry: hours[key] }))
    .sort((a, b) => a.min - b.min);

  const ranges: SlotRange[] = [];
  for (const slot of slots) {
    const last = ranges[ranges.length - 1];
    if (last && last.endMin === slot.min && sameEntry(last.entry, slot.entry)) {
      last.endMin = slot.min + slotMinutes;
    } else {
      ranges.push({
        startMin: slot.min,
        endMin: slot.min + slotMinutes,
        entry: slot.entry,
      });
    }
  }
  return ranges;
}
