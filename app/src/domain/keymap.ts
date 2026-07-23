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
  | { type: "new" }
  | { type: "timer" }
  | { type: "copy" }
  | { type: "paste" };

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

/** Voce del pannello Aiuto: i tasti da premere e cosa fanno. */
export interface ShortcutDoc {
  group: "Navigazione" | "Attività" | "Modifica";
  /** Tasti in sequenza: `g` poi `d` sono due elementi. */
  press: KeyInput[];
  label: string;
  action: ShortcutAction;
}

const k = (key: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

/**
 * Le scorciatoie in forma di dati, per il pannello Aiuto. Un test le fa passare
 * da `resolveKey` e verifica che producano l'azione dichiarata: la lista non può
 * divergere dal comportamento reale senza diventare rossa.
 */
export const SHORTCUTS: ShortcutDoc[] = [
  { group: "Navigazione", press: [k("g"), k("d")], label: "Vai al Giorno", action: { type: "view", view: "day" } },
  { group: "Navigazione", press: [k("g"), k("w")], label: "Vai alla Settimana", action: { type: "view", view: "week" } },
  { group: "Navigazione", press: [k("g"), k("m")], label: "Vai al Mese", action: { type: "view", view: "month" } },
  { group: "Navigazione", press: [k("k", { metaKey: true })], label: "Apri la Ricerca", action: { type: "view", view: "search" } },
  { group: "Attività", press: [k("n")], label: "Nuova attività", action: { type: "new" } },
  { group: "Attività", press: [k("t")], label: "Avvia o ferma il timer", action: { type: "timer" } },
  { group: "Modifica", press: [k("c", { metaKey: true })], label: "Copia l'attività aperta", action: { type: "copy" } },
  { group: "Modifica", press: [k("v", { metaKey: true })], label: "Incolla l'attività copiata", action: { type: "paste" } },
  { group: "Modifica", press: [k("z", { metaKey: true })], label: "Annulla", action: { type: "undo" } },
  { group: "Modifica", press: [k("z", { metaKey: true, shiftKey: true })], label: "Ripeti", action: { type: "redo" } },
];

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
    if (k === "c") return cleared({ type: "copy" });
    if (k === "v") return cleared({ type: "paste" });
    return cleared(null);
  }

  // Secondo tasto di una sequenza (g …).
  if (state.prefix === "g") {
    const view = GO_TO[k];
    return cleared(view ? { type: "view", view } : null);
  }

  if (k === "g") return { state: { prefix: "g" }, action: null };
  if (k === "n") return cleared({ type: "new" });
  if (k === "t") return cleared({ type: "timer" });

  return cleared(null);
}
