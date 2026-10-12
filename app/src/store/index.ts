import { create } from "zustand";
import type { Id } from "@/data/types";
import type { ViewMode } from "@/domain/view";
import { shiftFocus } from "@/domain/calendarNav";

export type { ViewMode };

/** Pre-filtri con cui aprire la vista Ricerca (es. da una persona). */
export interface SearchSeed {
  collaboratorId?: Id;
  contactId?: Id;
}

/**
 * Store globale (Zustand). Slice UI: vista corrente e data focale con
 * navigazione (prev/next/oggi) dipendente dalla vista.
 * Slice futuri: calendar (entry), settings, drag, history (undo/redo).
 */
interface UiState {
  view: ViewMode;
  activeDate: Date;
  /** Filtri da applicare all'apertura della Ricerca; consumato dalla vista. */
  searchSeed: SearchSeed | null;
  /** Mese aperto dalla voce "Riepilogo" della rail (non dallo switch del
   * calendario): decide quale voce della rail risulta attiva. */
  summary: boolean;
  setView: (view: ViewMode) => void;
  /** Apre il Mese come Riepilogo. */
  openSummary: () => void;
  setActiveDate: (date: Date) => void;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
  /** Apre la Ricerca con dei pre-filtri (es. tutte le attività di una persona). */
  openSearch: (seed: SearchSeed) => void;
  consumeSearchSeed: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  view: "month",
  activeDate: new Date(),
  searchSeed: null,
  summary: false,
  setView: (view) => set({ view, summary: false }),
  openSummary: () => set({ view: "month", summary: true }),
  setActiveDate: (activeDate) => set({ activeDate }),
  goPrev: () => set({ activeDate: shiftFocus(get().activeDate, get().view, -1) }),
  goNext: () => set({ activeDate: shiftFocus(get().activeDate, get().view, 1) }),
  goToday: () => set({ activeDate: new Date() }),
  openSearch: (seed) => set({ view: "search", searchSeed: seed, summary: false }),
  consumeSearchSeed: () => set({ searchSeed: null }),
}));
