import { create } from "zustand";
import type { ViewMode } from "@/domain/view";

export type { ViewMode };

/**
 * Store globale (Zustand). Per ora solo lo slice UI minimo.
 * Slice futuri: calendar, settings, drag (reducer), history (undo/redo).
 */
interface UiState {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: "month",
  setView: (view) => set({ view }),
}));
