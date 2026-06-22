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

export interface DayPreset {
  id: "full" | "morning" | "afternoon";
  label: string;
  startMin: number;
  endMin: number;
}

/**
 * Scorciatoie di durata ricavate dalla giornata lavorativa: giornata intera,
 * mattina e pomeriggio. Usate dall'editor per impostare gli orari con un gesto
 * (es. ferie tutto il giorno o mezza giornata). Pura.
 */
export function dayPresets(wh: WorkHours): DayPreset[] {
  return [
    { id: "full", label: "Giornata", startMin: wh.morningStart, endMin: wh.afternoonEnd },
    { id: "morning", label: "Mattina", startMin: wh.morningStart, endMin: wh.morningEnd },
    { id: "afternoon", label: "Pomeriggio", startMin: wh.afternoonStart, endMin: wh.afternoonEnd },
  ];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Minuti dalla mezzanotte → "HH:MM". */
export function minutesToLabel(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/** Minuti dalla mezzanotte dall'orario di un datetime ISO ("…THH:MM:…"). */
export function minutesOfDay(iso: string): number {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

/**
 * Posizione di un'entry sulla griglia a slot: riga d'inizio (indice 0-based in
 * `slots`) e numero di slot occupati. `null` se l'inizio non è in una fascia.
 */
export function entryRowSpan(
  startMin: number,
  endMin: number,
  slots: number[],
): { startRow: number; span: number } | null {
  const startRow = slots.indexOf(startMin);
  if (startRow === -1) return null;
  const span = Math.max(
    1,
    slots.filter((s) => s >= startMin && s < endMin).length,
  );
  return { startRow, span };
}
