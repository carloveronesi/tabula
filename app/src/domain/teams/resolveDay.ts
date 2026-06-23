import type { ISODate } from "@/data/types";
import { addDays, isoDate, dowMon0 } from "@/domain/calendarNav";

/**
 * Risolve l'etichetta di giorno della cronologia Teams in una data assoluta,
 * relativa a `today`. La lista Teams guarda al passato: "Ieri" è ieri, un nome di
 * giorno (es. "venerdì") è la sua occorrenza passata più recente (mai oggi, mai
 * futura). Le date numeriche ("12/06", "12/06/2026") si interpretano nell'anno di
 * `today` se l'anno manca. `null` quando l'etichetta non è interpretabile: in tal
 * caso il chiamante ricade su `today`.
 */
export function resolveDayLabel(
  label: string | null,
  today: Date,
): ISODate | null {
  if (!label) return null;
  const f = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  if (f === "oggi") return isoDate(today);
  // "leri" = "Ieri" letto male dall'OCR (I maiuscola → l minuscola).
  if (f === "ieri" || f === "leri") return isoDate(addDays(today, -1));
  if (f === "l'altro ieri") return isoDate(addDays(today, -2));

  const weekday = WEEKDAYS_FOLDED.indexOf(f); // lun=0…dom=6
  if (weekday !== -1) return mostRecentPast(today, weekday);

  const numeric = parseNumericDate(f, today.getFullYear());
  if (numeric) return numeric;

  return null;
}

const WEEKDAYS_FOLDED = [
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
  "domenica",
];

/** Occorrenza passata più recente del giorno `weekday` (lun=0…dom=6), esclusa oggi. */
function mostRecentPast(today: Date, weekday: number): ISODate {
  const diff = (dowMon0(today) - weekday + 7) % 7 || 7;
  return isoDate(addDays(today, -diff));
}

/** "12/06" o "12/06/2026" (separatori / . -) → ISODate, o null. */
function parseNumericDate(f: string, fallbackYear: number): ISODate | null {
  const m = f.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let year = m[3] ? Number(m[3]) : fallbackYear;
  if (year < 100) year += 2000;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
