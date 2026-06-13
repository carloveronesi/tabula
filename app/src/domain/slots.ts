export interface WorkHours {
  morningStart: number;
  morningEnd: number;
  afternoonStart: number;
  afternoonEnd: number;
}

export interface WorkSlots {
  morning: number[];
  afternoon: number[];
  all: number[];
}

function slotStarts(start: number, end: number, step: number): number[] {
  const out: number[] = [];
  for (let m = start; m + step <= end; m += step) out.push(m);
  return out;
}

/**
 * Slot lavorativi del giorno (minuti d'inizio), per mattino e pomeriggio.
 * Uno slot è incluso solo se rientra interamente nella fascia.
 */
export function buildSlots(wh: WorkHours, slotMinutes: number): WorkSlots {
  const morning = slotStarts(wh.morningStart, wh.morningEnd, slotMinutes);
  const afternoon = slotStarts(wh.afternoonStart, wh.afternoonEnd, slotMinutes);
  return { morning, afternoon, all: [...morning, ...afternoon] };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Minuti dalla mezzanotte → "HH:MM". */
export function minutesToLabel(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}
