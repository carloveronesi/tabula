/**
 * Logica pura del campo orario (TimeField). Niente UI: parsing tollerante di un
 * orario digitato, snap alla granularità e step su/giù. Minuti dalla mezzanotte.
 */

const DAY_MIN = 24 * 60 - 1; // 23:59

/** Vincola un valore nell'arco della giornata (0..1439). */
export function clampMin(min: number): number {
  return Math.max(0, Math.min(DAY_MIN, Math.round(min)));
}

/** Arrotonda alla griglia `step` (es. 15/30 min). */
export function snap(min: number, step: number): number {
  if (step <= 0) return clampMin(min);
  return clampMin(Math.round(min / step) * step);
}

/**
 * Interpreta un orario digitato in molti formati: "9", "9:30", "9:3" (→ 09:03),
 * "09.30", "930", "1745", "9h30". Ritorna i minuti dalla mezzanotte, o `null` se
 * non valido (minuti ≥ 60, oltre le 23:59, o testo non numerico). Nota: qui non
 * c'è arrotondamento — lo snap alla griglia avviene in chi chiama (TimeField).
 */
export function parseTimeInput(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/h/g, ":");
  if (!s) return null;

  let h: number;
  let m: number;
  if (s.includes(":") || s.includes(".")) {
    const parts = s.split(/[:.]/);
    if (parts.length > 2) return null;
    const [hp, mp = "0"] = parts;
    if (!/^\d{1,2}$/.test(hp) || !/^\d{1,2}$/.test(mp)) return null;
    h = Number(hp);
    m = Number(mp);
  } else {
    if (!/^\d{1,4}$/.test(s)) return null;
    if (s.length <= 2) {
      h = Number(s);
      m = 0;
    } else {
      h = Number(s.slice(0, s.length - 2));
      m = Number(s.slice(s.length - 2));
    }
  }

  if (m >= 60) return null;
  const total = h * 60 + m;
  if (total < 0 || total > DAY_MIN) return null;
  return total;
}

/** Step su (`dir` +1) o giù (-1) di `step` minuti, allineato alla griglia. */
export function stepTime(min: number, dir: 1 | -1, step: number): number {
  const grid = step > 0 ? step : 1;
  return clampMin(snap(min, grid) + dir * grid);
}

/** Minuti → "HH:MM" con cifre zero-padded. */
export function formatTime(min: number): string {
  const c = clampMin(min);
  const h = Math.floor(c / 60);
  const m = c % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
