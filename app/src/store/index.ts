import { create } from "zustand";

/**
 * Store globale (Zustand). Per ora solo lo slice UI minimo.
 * Slice futuri (Fase 3): calendar, settings, drag (reducer), history (undo/redo).
 */
export type ViewMode = "month" | "week" | "day" | "projects" | "todo";

interface UiState {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  view: "month",
  setView: (view) => set({ view }),
}));
