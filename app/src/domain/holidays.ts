/**
 * Festività nazionali italiane. Logica pura, indipendente dall'anno: le ricorrenze
 * a data fissa stanno in tabella, la Pasquetta (Lunedì dell'Angelo) si ricava dalla
 * domenica di Pasqua calcolata col Computus gregoriano.
 */
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Domenica di Pasqua dell'anno (algoritmo di Computus gregoriano, variante
 * "Anonymous Gregorian"/Meeus). Restituisce una data locale a mezzanotte.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = aprile
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Festività nazionali a data fissa: "MM-GG" → nome. */
const FIXED: Record<string, string> = {
  "01-01": "Capodanno",
  "01-06": "Epifania",
  "04-25": "Festa della Liberazione",
  "05-01": "Festa del Lavoro",
  "06-02": "Festa della Repubblica",
  "08-15": "Ferragosto",
  "11-01": "Ognissanti",
  "12-08": "Immacolata Concezione",
  "12-25": "Natale",
  "12-26": "Santo Stefano",
};

/**
 * Nome della festività nazionale italiana per la data, o `null` se feriale.
 * Copre le festività a data fissa e il Lunedì dell'Angelo (Pasquetta); la
 * domenica di Pasqua è già un weekend, quindi non viene etichettata a parte.
 */
export function nationalHolidayName(date: Date): string | null {
  const md = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  if (FIXED[md]) return FIXED[md];
  const easterMonday = easterSunday(date.getFullYear());
  easterMonday.setDate(easterMonday.getDate() + 1); // Pasqua può cadere a fine mese
  if (
    date.getMonth() === easterMonday.getMonth() &&
    date.getDate() === easterMonday.getDate()
  ) {
    return "Lunedì dell'Angelo";
  }
  return null;
}
