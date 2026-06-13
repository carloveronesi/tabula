/**
 * Storico undo/redo puro e generico.
 *
 * Un `Change<T>` descrive la transizione di un singolo elemento (per id):
 * `before` è lo stato precedente (`null` = non esisteva), `after` quello nuovo
 * (`null` = eliminato). Per annullare si riapplica `before`, per ripetere `after`.
 * La logica di scrittura (DB/stato) resta a chi consuma lo storico: qui solo gli
 * stack `past`/`future`, senza effetti collaterali.
 */
export interface Change<T> {
  before: T | null;
  after: T | null;
}

export interface History<T> {
  past: Change<T>[];
  future: Change<T>[];
}

export const emptyHistory = <T>(): History<T> => ({ past: [], future: [] });

export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0;
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0;

/** Registra un nuovo cambiamento: lo impila su `past` e azzera il `future`. */
export function record<T>(h: History<T>, change: Change<T>): History<T> {
  return { past: [...h.past, change], future: [] };
}

/**
 * Sposta l'ultimo cambiamento da `past` a `future` e lo restituisce: chi consuma
 * applica `change.before` per riportare lo stato indietro. `null` se non c'è nulla.
 */
export function undo<T>(
  h: History<T>,
): { history: History<T>; change: Change<T> } | null {
  if (!canUndo(h)) return null;
  const change = h.past[h.past.length - 1];
  return {
    history: { past: h.past.slice(0, -1), future: [change, ...h.future] },
    change,
  };
}

/**
 * Riporta il primo cambiamento da `future` a `past` e lo restituisce: chi consuma
 * applica `change.after` per ripetere l'azione. `null` se non c'è nulla.
 */
export function redo<T>(
  h: History<T>,
): { history: History<T>; change: Change<T> } | null {
  if (!canRedo(h)) return null;
  const change = h.future[0];
  return {
    history: { past: [...h.past, change], future: h.future.slice(1) },
    change,
  };
}
