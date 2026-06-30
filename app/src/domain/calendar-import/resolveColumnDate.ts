/**
 * Risolve l'etichetta di una colonna del calendario (es. "29 Lun", "01 mer") alla
 * data reale, ancorandosi al giorno da cui si è aperto l'import. Lo screenshot non
 * riporta mese/anno: il numero del giorno individua la data nella settimana attorno
 * all'ancora (gestisce i confini di mese, es. 30 giugno → 01 luglio). Senza numero,
 * ripiega sull'abbreviazione del giorno nella settimana dell'ancora; senza neppure
 * quella, resta l'ancora.
 */
import type { ISODate } from "@/data/types";
import { isoDate } from "@/domain/calendarNav";

// getDay(): 0 = domenica … 6 = sabato.
const WEEKDAY: Record<string, number> = {
  dom: 0,
  lun: 1,
  mar: 2,
  mer: 3,
  gio: 4,
  ven: 5,
  sab: 6,
};

export function resolveColumnDate(label: string, anchor: ISODate): ISODate {
  const base = new Date(`${anchor}T00:00:00`);
  const dayNum = label.match(/\d{1,2}/)?.[0];
  const wd = label.toLowerCase().match(/\b(lun|mar|mer|gio|ven|sab|dom)\b/)?.[1];

  // Numero del giorno: cerca nei ±10 giorni intorno all'ancora (in una finestra
  // così stretta un dato giorno-del-mese compare una volta sola).
  if (dayNum) {
    const dd = Number(dayNum);
    for (let off = -10; off <= 10; off++) {
      const d = new Date(base);
      d.setDate(d.getDate() + off);
      if (d.getDate() === dd) return isoDate(d);
    }
  }

  // Ripiego: abbreviazione del giorno → quel giorno nella settimana dell'ancora.
  if (wd !== undefined) {
    const d = new Date(base);
    const toMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
    const offset = WEEKDAY[wd] === 0 ? 6 : WEEKDAY[wd] - 1; // lun=0 … dom=6
    d.setDate(d.getDate() + toMonday + offset);
    return isoDate(d);
  }

  return anchor;
}
