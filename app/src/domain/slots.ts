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

/**
 * Indice di riga dove inizia il pomeriggio (= n° slot mattutini), ovvero il
 * confine della pausa pranzo nella griglia a slot. `null` quando non c'è pausa
 * da mostrare: pomeriggio attaccato al mattino, o una delle due fasce vuota.
 */
export function lunchBoundary(wh: WorkHours, slotMinutes: number): number | null {
  if (wh.afternoonStart <= wh.morningEnd) return null;
  const { morning, afternoon } = buildSlots(wh, slotMinutes);
  if (morning.length === 0 || afternoon.length === 0) return null;
  return morning.length;
}

/**
 * Orario di *fine fascia* da etichettare sul bordo inferiore della riga `i`,
 * oppure `null`. Le fasce finiscono su orari che non sono inizi-slot (es. 13:00 a
 * fine mattino, 18:00 a fine giornata): senza questo la griglia non li mostrerebbe
 * e la giornata sembrerebbe finire alle 12:30 / 17:30. `boundary` = confine pausa,
 * `lastIdx` = indice dell'ultimo slot. Pura.
 */
export function fasciaEndLabel(
  i: number,
  slotMin: number,
  boundary: number | null,
  lastIdx: number,
  wh: WorkHours,
): number | null {
  if (boundary !== null && i === boundary - 1) return wh.morningEnd;
  if (i === lastIdx) return slotMin >= wh.afternoonStart ? wh.afternoonEnd : wh.morningEnd;
  return null;
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

/**
 * Vero se l'attività [startMin, endMin) non sta dentro la giornata lavorativa:
 * l'inizio o la fine cadono nella pausa pranzo o fuori dalle fasce mattino/
 * pomeriggio. Un'attività a cavallo della pausa (inizia in mattina, finisce nel
 * pomeriggio) è regolare. Usata per l'avviso non bloccante dell'editor — non
 * impedisce il salvataggio, segnala solo che l'orario è anomalo.
 */
export function outsideWorkHours(
  startMin: number,
  endMin: number,
  wh: WorkHours,
): boolean {
  const startOk =
    (startMin >= wh.morningStart && startMin < wh.morningEnd) ||
    (startMin >= wh.afternoonStart && startMin < wh.afternoonEnd);
  const endOk =
    (endMin > wh.morningStart && endMin <= wh.morningEnd) ||
    (endMin > wh.afternoonStart && endMin <= wh.afternoonEnd);
  return !startOk || !endOk;
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
 * `slots`) e numero di slot occupati. `null` solo se l'entry non copre alcuno
 * slot lavorativo.
 *
 * Se l'inizio coincide con uno slot lo usa come riga; se invece cade *fuori*
 * dagli slot ma l'entry ne copre comunque qualcuno (es. un'attività che parte
 * nella pausa pranzo perché gli orari di lavoro sono cambiati dopo averla
 * creata) si aggancia al primo slot coperto. Così resta visibile e cliccabile
 * invece di sparire pur continuando a bloccare lo slot — l'invariante è che
 * tutto ciò che conta come conflitto (selettore rosso) dev'essere disegnato.
 */
export function entryRowSpan(
  startMin: number,
  endMin: number,
  slots: number[],
): { startRow: number; span: number } | null {
  const covered = slots.filter((s) => s >= startMin && s < endMin);
  const anchor = slots.includes(startMin) ? startMin : covered[0];
  if (anchor === undefined) return null;
  return { startRow: slots.indexOf(anchor), span: Math.max(1, covered.length) };
}
