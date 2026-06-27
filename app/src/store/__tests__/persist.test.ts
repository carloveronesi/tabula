import { describe, it, expect, beforeEach, vi } from "vitest";

// La scrittura su DB fallisce: `persist` deve notificare un toast danger e
// lasciare lo stato (memoria + storico) invariato.
vi.mock("@/data/repositories", () => ({
  putEntry: vi.fn(() => Promise.reject(new Error("quota esaurita"))),
  deleteEntry: vi.fn(() => Promise.resolve()),
  entriesInRange: vi.fn(() => Promise.resolve([])),
}));

import { useCalendarStore } from "@/store/calendar";
import { useToastStore } from "@/store/toast";
import { emptyHistory, canUndo } from "@/domain/history";
import type { Entry } from "@/data/types";

const entry: Entry = {
  id: "a",
  startsAt: "2026-06-12T09:00:00",
  endsAt: "2026-06-12T10:00:00",
  type: "client",
  projectId: null,
  clientId: null,
  subtypeId: null,
  title: "a",
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

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  useCalendarStore.setState({ entries: [], history: emptyHistory<Entry>() });
  useToastStore.setState({ toasts: [] });
});

describe("persist", () => {
  it("su scrittura fallita notifica un toast danger", async () => {
    await useCalendarStore.getState().saveEntry(entry);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].variant).toBe("danger");
    expect(toasts[0].message).toMatch(/non riuscito/);
  });

  it("su scrittura fallita lascia memoria e storico invariati", async () => {
    await useCalendarStore.getState().saveEntry(entry);

    expect(useCalendarStore.getState().entries).toEqual([]);
    expect(canUndo(useCalendarStore.getState().history)).toBe(false);
  });

  it("non rilancia: il chiamante non deve gestire l'errore", async () => {
    await expect(
      useCalendarStore.getState().saveEntry(entry),
    ).resolves.toBeUndefined();
  });
});
