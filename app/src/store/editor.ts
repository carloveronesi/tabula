import { create } from "zustand";
import type { Entry, Id, ISODate } from "@/data/types";

export interface EditorSeed {
  date: ISODate;
  startMin: number;
  endMin: number;
  /** Pre-compilazioni opzionali (es. quando si passa dal quick-add). */
  title?: string;
  clientId?: Id | null;
}

/** Punto-ancora in coordinate viewport per posizionare il quick-add. */
export interface Anchor {
  x: number;
  y: number;
}

/** Stato del quick-add: cosa creare e dove ancorare il popover. */
export interface QuickAdd {
  date: ISODate;
  startMin: number;
  endMin: number;
  anchor: Anchor | null;
}

const DEFAULT_SEED: EditorSeed = {
  date: "1970-01-01",
  startMin: 540,
  endMin: 600,
};

interface EditorState {
  /** Editor (modale) aperto. */
  open: boolean;
  /** Entry in modifica; `null` = nuova. */
  base: Entry | null;
  /** Valori iniziali per una nuova entry. */
  seed: EditorSeed;
  /** Quick-add ancorato all'orario; `null` = chiuso. */
  quickAdd: QuickAdd | null;
  /** Entry mostrata nel pannello dettaglio; `null` = chiuso. */
  detail: Entry | null;
  /** Entry copiata negli appunti, pronta da incollare; `null` = vuoto. */
  clipboard: Entry | null;

  openCreate: (seed: EditorSeed) => void;
  openEdit: (entry: Entry) => void;
  close: () => void;
  openQuickAdd: (qa: QuickAdd) => void;
  closeQuickAdd: () => void;
  showDetail: (entry: Entry) => void;
  hideDetail: () => void;
  copyEntry: (entry: Entry) => void;
}

/**
 * Stato di interazione di editor e dettaglio: cosa è aperto e su quale entry.
 * I dati restano nel calendar store; qui vive solo il "cosa sto guardando".
 */
export const useEditorStore = create<EditorState>((set) => ({
  open: false,
  base: null,
  seed: DEFAULT_SEED,
  quickAdd: null,
  detail: null,
  clipboard: null,

  openCreate: (seed) =>
    set({ open: true, base: null, seed, detail: null, quickAdd: null }),
  openEdit: (entry) =>
    set({ open: true, base: entry, detail: null, quickAdd: null }),
  close: () => set({ open: false, base: null }),
  openQuickAdd: (quickAdd) => set({ quickAdd, detail: null }),
  closeQuickAdd: () => set({ quickAdd: null }),
  showDetail: (entry) => set({ detail: entry }),
  hideDetail: () => set({ detail: null }),
  copyEntry: (entry) => set({ clipboard: entry }),
}));
