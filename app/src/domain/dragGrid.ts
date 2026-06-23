/**
 * Matematica pura del drag sulla griglia a slot. Lavora in "righe" (indici di
 * slot interi); la conversione in minuti avviene solo alla fine via `rowsToRange`.
 * Nessuna dipendenza dal DOM: l'UI passa offset/delta in pixel e il numero di slot.
 */

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/**
 * Altezza in px della striscia "pausa pranzo": fissa e compatta, scollegata
 * dall'altezza-slot. Sposta in basso le sole righe del pomeriggio (vedi
 * `rowTop`/`rowAtOffset`), così la pausa è visibile ma non mangia la densità.
 */
export const LUNCH_BAND = 28;

/** Le due righe stanno nella stessa fascia rispetto al confine pausa? */
function sameSide(a: number, b: number, boundary: number | null): boolean {
  return boundary === null || a < boundary === b < boundary;
}

/**
 * Top in px di una riga: `row * slotHeight`, più la striscia pausa se la riga
 * è nel pomeriggio (indice ≥ `boundary`). `boundary` null → nessuna pausa.
 */
export function rowTop(
  row: number,
  slotHeight: number,
  boundary: number | null,
  band = LUNCH_BAND,
): number {
  return row * slotHeight + (boundary !== null && row >= boundary ? band : 0);
}

/**
 * Riga sotto il puntatore dato l'offset Y nell'area griglia (clampata). Con una
 * pausa (`boundary`), l'offset oltre il mattino è ridotto della striscia: un
 * puntatore *dentro* la banda ricade sul primo slot del pomeriggio.
 */
export function rowAtOffset(
  offsetY: number,
  slotHeight: number,
  slotCount: number,
  boundary: number | null = null,
  band = LUNCH_BAND,
): number {
  let y = offsetY;
  if (boundary !== null && boundary > 0) {
    const split = boundary * slotHeight; // fondo del mattino, in px
    if (y >= split) y = Math.max(split, y - band);
  }
  return clamp(Math.floor(y / slotHeight), 0, slotCount - 1);
}

/** Colonna (giorno) sotto il puntatore dato l'offset X nell'area colonne. */
export function columnAtOffset(
  offsetX: number,
  columnWidth: number,
  columnCount: number,
): number {
  if (columnWidth <= 0) return 0;
  return clamp(Math.floor(offsetX / columnWidth), 0, columnCount - 1);
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

/**
 * Limita una creazione a non scavalcare la pausa: se l'intervallo attraversa il
 * confine, lo si tronca tenendo la fascia dell'*ancora* (il punto dove il drag è
 * iniziato). `boundary` null → invariato.
 */
export function clampCreateToSide(
  startRow: number,
  span: number,
  anchorRow: number,
  boundary: number | null,
): { startRow: number; span: number } {
  const endRow = startRow + span - 1;
  if (boundary === null || sameSide(startRow, endRow, boundary)) {
    return { startRow, span };
  }
  return anchorRow < boundary
    ? { startRow, span: boundary - startRow } // ancora nel mattino → ferma a fine mattino
    : { startRow: boundary, span: endRow - boundary + 1 }; // ancora nel pomeriggio
}

/**
 * Nuovo startRow di un blocco spostato di `dRows`, tenuto nei limiti. Con una
 * pausa (`boundary`), il blocco non può restare a cavallo: se lo scavalcherebbe,
 * salta interamente nella fascia verso cui si muove (quando ci sta).
 */
export function moveBlock(
  startRow: number,
  span: number,
  dRows: number,
  slotCount: number,
  boundary: number | null = null,
): number {
  const next = clamp(startRow + dRows, 0, slotCount - span);
  if (boundary === null || sameSide(next, next + span - 1, boundary)) return next;
  const morningStart = boundary - span; // ultimo start tutto-mattino
  const canMorning = morningStart >= 0;
  const canAfternoon = boundary + span <= slotCount;
  const goDown = dRows > 0;
  const target =
    goDown && canAfternoon
      ? boundary
      : !goDown && canMorning
        ? morningStart
        : canAfternoon
          ? boundary
          : canMorning
            ? morningStart
            : next; // non ci sta in nessuna fascia (blocco più lungo di una fascia)
  return clamp(target, 0, slotCount - span);
}

/**
 * Ridimensiona dal bordo superiore (span minimo 1, non supera il fondo). Con una
 * pausa, se il blocco è nel pomeriggio il bordo superiore non risale oltre il
 * confine.
 */
export function resizeTop(
  startRow: number,
  span: number,
  dRows: number,
  boundary: number | null = null,
): { startRow: number; span: number } {
  const bottom = startRow + span - 1; // ultima riga occupata, fissa
  let newStart = clamp(startRow + dRows, 0, bottom);
  if (boundary !== null && bottom >= boundary) newStart = Math.max(newStart, boundary);
  return { startRow: newStart, span: bottom - newStart + 1 };
}

/**
 * Ridimensiona dal bordo inferiore (span minimo 1, entro i limiti). Con una
 * pausa, se il blocco è nel mattino il bordo inferiore non scende oltre il
 * confine.
 */
export function resizeBottom(
  startRow: number,
  span: number,
  dRows: number,
  slotCount: number,
  boundary: number | null = null,
): { startRow: number; span: number } {
  let newEnd = clamp(startRow + span - 1 + dRows, startRow, slotCount - 1);
  if (boundary !== null && startRow < boundary) newEnd = Math.min(newEnd, boundary - 1);
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
