import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { useCalendarStore } from "@/store/calendar";
import type { Entry, ISODateTime } from "@/data/types";

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
  useCalendarStore.setState({ entries: [] });
});

describe("useCalendarStore", () => {
  it("default: nessuna entry", () => {
    expect(useCalendarStore.getState().entries).toEqual([]);
  });

  it("loadRange carica solo le entry del periodo", async () => {
    await db.entries.bulkPut([
      entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00"),
      entry("b", "2026-06-12T09:00:00", "2026-06-12T10:00:00"),
      entry("c", "2026-07-01T09:00:00", "2026-07-01T10:00:00"),
    ]);

    await useCalendarStore
      .getState()
      .loadRange("2026-06-01T00:00:00", "2026-06-30T23:59:59");

    const ids = useCalendarStore
      .getState()
      .entries.map((e) => e.id)
      .sort();
    expect(ids).toEqual(["a", "b"]);
  });

  it("saveEntry scrive su DB e aggiunge allo stato", async () => {
    const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
    await useCalendarStore.getState().saveEntry(e);

    expect(await db.entries.get("a")).toEqual(e);
    expect(useCalendarStore.getState().entries.map((x) => x.id)).toEqual(["a"]);
  });

  it("saveEntry sostituisce una entry con lo stesso id (no duplicati)", async () => {
    const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
    await useCalendarStore.getState().saveEntry(e);
    await useCalendarStore
      .getState()
      .saveEntry({ ...e, title: "modificata" });

    const entries = useCalendarStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("modificata");
    expect((await db.entries.get("a"))?.title).toBe("modificata");
  });

  it("removeEntry elimina da DB e stato", async () => {
    const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
    await useCalendarStore.getState().saveEntry(e);

    await useCalendarStore.getState().removeEntry("a");

    expect(await db.entries.get("a")).toBeUndefined();
    expect(useCalendarStore.getState().entries).toEqual([]);
  });
});
