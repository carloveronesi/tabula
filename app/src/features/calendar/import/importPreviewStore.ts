/**
 * Canale tra il pannello di import e la vista Giorno: il pannello pubblica qui i
 * blocchi-anteprima (gli eventi che sta per creare), la griglia li disegna come
 * fantasmi così l'utente ne vede posizione e durata reali. Vuoto = nessun import.
 */
import { create } from "zustand";
import type { ISODate } from "@/data/types";

export interface PreviewBlock {
  key: string;
  /** Giorno dell'evento: la griglia mostra solo i blocchi del giorno visualizzato. */
  date: ISODate;
  /** Titolo mostrato nel fantasma, per riconoscere l'evento sulla griglia. */
  label: string;
  startMin: number;
  endMin: number;
  /** Si sovrappone a un'attività esistente o a un'altra riga importata. */
  conflict: boolean;
}

interface PreviewState {
  blocks: PreviewBlock[];
  setBlocks: (blocks: PreviewBlock[]) => void;
}

export const useImportPreviewStore = create<PreviewState>((set) => ({
  blocks: [],
  setBlocks: (blocks) => set({ blocks }),
}));
