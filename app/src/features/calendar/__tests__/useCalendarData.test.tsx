import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import { DEFAULT_SETTINGS } from "@/data/settings";
import type { Entry, ISODateTime, Settings } from "@/data/types";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useCalendarData } from "@/features/calendar/useCalendarData";

function entry(id: string, startsAt: ISODateTime, endsAt: ISODateTime): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: id,
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

beforeEach(async () => {
  await db.entries.clear();
  await db.settings.clear();
  useCalendarStore.setState({ entries: [] });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
  useUiStore.setState({ view: "day", activeDate: new Date(2026, 5, 12) });
});

describe("useCalendarData", () => {
  it("al mount carica le impostazioni dal DB", async () => {
    const stored: Settings = { ...DEFAULT_SETTINGS, slotMinutes: 15 };
    await db.settings.put(stored);

    renderHook(() => useCalendarData());

    await waitFor(() =>
      expect(useSettingsStore.getState().settings.slotMinutes).toBe(15),
    );
  });

  it("carica le entry del giorno mostrato", async () => {
    await db.entries.bulkPut([
      entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00"),
      entry("b", "2026-06-13T09:00:00", "2026-06-13T10:00:00"),
    ]);

    renderHook(() => useCalendarData());

    await waitFor(() =>
      expect(useCalendarStore.getState().entries.map((e) => e.id)).toEqual([
        "a",
      ]),
    );
  });

  it("ricarica quando cambia la data focale", async () => {
    await db.entries.bulkPut([
      entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00"),
      entry("b", "2026-06-13T09:00:00", "2026-06-13T10:00:00"),
    ]);

    renderHook(() => useCalendarData());
    await waitFor(() =>
      expect(useCalendarStore.getState().entries.map((e) => e.id)).toEqual([
        "a",
      ]),
    );

    act(() => useUiStore.setState({ activeDate: new Date(2026, 5, 13) }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries.map((e) => e.id)).toEqual([
        "b",
      ]),
    );
  });

  it("allarga il range quando si passa alla vista Mese", async () => {
    await db.entries.bulkPut([
      entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00"),
      entry("b", "2026-06-25T09:00:00", "2026-06-25T10:00:00"),
    ]);

    renderHook(() => useCalendarData());
    await waitFor(() =>
      expect(useCalendarStore.getState().entries.map((e) => e.id)).toEqual([
        "a",
      ]),
    );

    act(() => useUiStore.setState({ view: "month" }));

    await waitFor(() =>
      expect(
        useCalendarStore
          .getState()
          .entries.map((e) => e.id)
          .sort(),
      ).toEqual(["a", "b"]),
    );
  });
});
