import { create } from "zustand";
import type { ViewMode } from "@/domain/view";
import { shiftFocus } from "@/domain/calendarNav";

export type { ViewMode };

/**
 * Store globale (Zustand). Slice UI: vista corrente e data focale con
 * navigazione (prev/next/oggi) dipendente dalla vista.
 * Slice futuri: calendar (entry), settings, drag, history (undo/redo).
 */
interface UiState {
  view: ViewMode;
  activeDate: Date;
  setView: (view: ViewMode) => void;
  setActiveDate: (date: Date) => void;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  view: "month",
  activeDate: new Date(),
  setView: (view) => set({ view }),
  setActiveDate: (activeDate) => set({ activeDate }),
  goPrev: () => set({ activeDate: shiftFocus(get().activeDate, get().view, -1) }),
  goNext: () => set({ activeDate: shiftFocus(get().activeDate, get().view, 1) }),
  goToday: () => set({ activeDate: new Date() }),
}));
