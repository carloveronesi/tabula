import { create } from "zustand";
import type { Settings } from "@/data/types";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { db } from "@/data/db";
import { persist } from "@/store/persist";

interface SettingsState {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  saveSettings: (settings: Settings) => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
  saveSettings: (settings) =>
    persist("Salvataggio impostazioni", async () => {
      await db.settings.put({ ...settings, id: "app" });
      set({ settings });
    }),
  loadSettings: async () => {
    const stored = await db.settings.get("app");
    set({ settings: stored ?? DEFAULT_SETTINGS });
  },
}));
