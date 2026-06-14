/**
 * Posizione della linea "ora corrente" nella griglia oraria. Pura: mappa i minuti
 * dalla mezzanotte alla coordinata in *righe* (frazionaria) coerente con la lista
 * di slot, che può avere buchi (es. pausa pranzo). `null` se l'ora è fuori
 * dall'orario mostrato o dentro un buco → la linea non si disegna.
 */
export function nowRowOffset(
  slots: number[],
  slotMinutes: number,
  nowMin: number,
): number | null {
  if (slots.length === 0 || slotMinutes <= 0) return null;
  if (nowMin < slots[0]) return null;
  for (let i = 0; i < slots.length; i++) {
    const start = slots[i];
    if (nowMin >= start && nowMin < start + slotMinutes) {
      return i + (nowMin - start) / slotMinutes;
    }
  }
  return null; // dopo l'ultimo slot o in un buco (pausa)
}

/** Minuti dalla mezzanotte per una data (default: adesso). */
export function minutesOfDay(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
