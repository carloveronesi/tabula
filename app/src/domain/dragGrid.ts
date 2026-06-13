/**
 * Matematica pura del drag sulla griglia a slot. Lavora in "righe" (indici di
 * slot interi); la conversione in minuti avviene solo alla fine via `rowsToRange`.
 * Nessuna dipendenza dal DOM: l'UI passa offset/delta in pixel e il numero di slot.
 */

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Riga sotto il puntatore dato l'offset Y nell'area griglia (clampata). */
export function rowAtOffset(
  offsetY: number,
  slotHeight: number,
  slotCount: number,
): number {
  return clamp(Math.floor(offsetY / slotHeight), 0, slotCount - 1);
}

/** Spostamento in righe intere a partire da un delta in pixel (snap). */
export function deltaRows(deltaY: number, slotHeight: number): number {
  return Math.round(deltaY / slotHeight);
}

/** Intervallo inclusivo tra due righe (ordine indifferente); minimo 1 slot. */
export function createRange(
  rowA: number,
  rowB: number,
): { startRow: number; span: number } {
  const startRow = Math.min(rowA, rowB);
  return { startRow, span: Math.abs(rowA - rowB) + 1 };
}

/** Nuovo startRow di un blocco spostato di `dRows`, tenuto nei limiti. */
export function moveBlock(
  startRow: number,
  span: number,
  dRows: number,
  slotCount: number,
): number {
  return clamp(startRow + dRows, 0, slotCount - span);
}

/** Ridimensiona dal bordo superiore (span minimo 1, non supera il fondo). */
export function resizeTop(
  startRow: number,
  span: number,
  dRows: number,
): { startRow: number; span: number } {
  const bottom = startRow + span - 1; // ultima riga occupata, fissa
  const newStart = clamp(startRow + dRows, 0, bottom);
  return { startRow: newStart, span: bottom - newStart + 1 };
}

/** Ridimensiona dal bordo inferiore (span minimo 1, entro i limiti). */
export function resizeBottom(
  startRow: number,
  span: number,
  dRows: number,
  slotCount: number,
): { startRow: number; span: number } {
  const newEnd = clamp(startRow + span - 1 + dRows, startRow, slotCount - 1);
  return { startRow, span: newEnd - startRow + 1 };
}

/** Converte (startRow, span) in minuti dalla mezzanotte usando l'array slot. */
export function rowsToRange(
  startRow: number,
  span: number,
  slots: number[],
  slotMinutes: number,
): { startMin: number; endMin: number } {
  return {
    startMin: slots[startRow],
    endMin: slots[startRow + span - 1] + slotMinutes,
  };
}
