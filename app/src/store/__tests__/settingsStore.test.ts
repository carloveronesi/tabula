import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { useSettingsStore } from "@/store/settings";
import { DEFAULT_SETTINGS } from "@/data/settings";

beforeEach(async () => {
  await db.settings.clear();
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("useSettingsStore", () => {
  it("default è DEFAULT_SETTINGS", () => {
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it("loadSettings carica il record dal DB", async () => {
    await db.settings.put({ ...DEFAULT_SETTINGS, slotMinutes: 15 });
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().settings.slotMinutes).toBe(15);
  });

  it("loadSettings senza record → default", async () => {
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it("setSettings aggiorna lo stato", () => {
    useSettingsStore.getState().setSettings({ ...DEFAULT_SETTINGS, theme: "dark" });
    expect(useSettingsStore.getState().settings.theme).toBe("dark");
  });

  it("saveSettings persiste su IndexedDB e aggiorna lo stato", async () => {
    await useSettingsStore
      .getState()
      .saveSettings({ ...DEFAULT_SETTINGS, slotMinutes: 30 });

    expect(useSettingsStore.getState().settings.slotMinutes).toBe(30);
    expect((await db.settings.get("app"))?.slotMinutes).toBe(30);
  });
});
