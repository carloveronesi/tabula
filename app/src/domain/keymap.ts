import type { ViewMode } from "@/domain/view";

/**
 * Mappa delle scorciatoie da tastiera, pura e testabile.
 * Lo stato tiene il "prefisso" delle sequenze a due tasti (es. `g` poi `d`).
 * `resolveKey` riceve lo stato e un evento normalizzato e restituisce il nuovo
 * stato + l'eventuale azione da eseguire (l'effetto resta a chi consuma).
 */
export type ShortcutAction =
  | { type: "undo" }
  | { type: "redo" }
  | { type: "view"; view: ViewMode }
  | { type: "new" };

export interface KeyState {
  /** Prefisso di una sequenza in atteso del secondo tasto. */
  prefix: "g" | null;
}

export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export const initialKeyState: KeyState = { prefix: null };

const cleared = (action: ShortcutAction | null) => ({
  state: initialKeyState,
  action,
});

const GO_TO: Record<string, ViewMode> = {
  d: "day",
  w: "week",
  m: "month",
};

export function resolveKey(
  state: KeyState,
  e: KeyInput,
): { state: KeyState; action: ShortcutAction | null } {
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();

  // I comandi con modificatori hanno priorità e azzerano sempre un prefisso.
  if (mod) {
    if (k === "z") return cleared(e.shiftKey ? { type: "redo" } : { type: "undo" });
    if (k === "y") return cleared({ type: "redo" });
    if (k === "k") return cleared({ type: "view", view: "search" });
    return cleared(null);
  }

  // Secondo tasto di una sequenza (g …).
  if (state.prefix === "g") {
    const view = GO_TO[k];
    return cleared(view ? { type: "view", view } : null);
  }

  if (k === "g") return { state: { prefix: "g" }, action: null };
  if (k === "n") return cleared({ type: "new" });

  return cleared(null);
}
