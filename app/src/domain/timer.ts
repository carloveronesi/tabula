import type { ISODate } from "@/data/types";
import { isoDate } from "@/domain/calendarNav";

/** Una bozza di fascia oraria (giorno + minuti) per pre-compilare l'editor. */
export interface TimerSeed {
  date: ISODate;
  startMin: number;
  endMin: number;
}

const MIN_PER_DAY = 24 * 60;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Arrotonda al multiplo di `slot` più vicino. */
function roundToSlot(min: number, slot: number): number {
  return Math.round(min / slot) * slot;
}

/**
 * Etichetta del tempo trascorso da un timer in corso. Formato compatto:
 * `m:ss` sotto l'ora, `h:mm:ss` da un'ora in su. Negativi trattati come 0.
 */
export function elapsedLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return h > 0
    ? `${h}:${pad2(m)}:${pad2(s)}`
    : `${m}:${pad2(s)}`;
}

/**
 * Dalla coppia avvio/stop ricava una fascia per l'editor: giorno e minuto
 * d'inizio (del momento di avvio, arrotondato allo slot) e fine ricavata dalla
 * durata trascorsa (in slot interi, almeno uno). Tutto è poi rivedibile a mano.
 * La fine è limitata a fine giornata: un timer che valica la mezzanotte va
 * sistemato dall'utente (caso raro per un diario di lavoro).
 */
export function timerSeed(
  startedAt: number,
  stoppedAt: number,
  slotMinutes: number,
): TimerSeed {
  const start = new Date(startedAt);
  const date = isoDate(start);

  const rawStartMin = start.getHours() * 60 + start.getMinutes();
  let startMin = Math.min(roundToSlot(rawStartMin, slotMinutes), MIN_PER_DAY - slotMinutes);

  const elapsedMin = Math.max(0, (stoppedAt - startedAt) / 60000);
  const slots = Math.max(1, Math.round(elapsedMin / slotMinutes));
  const endMin = Math.min(startMin + slots * slotMinutes, MIN_PER_DAY);

  // Difesa: garantisci almeno uno slot di durata.
  if (endMin <= startMin) startMin = endMin - slotMinutes;

  return { date, startMin, endMin };
}
