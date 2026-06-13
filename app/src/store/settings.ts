import { create } from "zustand";
import type { Settings } from "@/data/types";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { db } from "@/data/db";

interface SettingsState {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
  loadSettings: async () => {
    const stored = await db.settings.get("app");
    set({ settings: stored ?? DEFAULT_SETTINGS });
  },
}));
