import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { useCalendarStore } from "@/store/calendar";
import { canUndo, canRedo, emptyHistory } from "@/domain/history";
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
  useCalendarStore.setState({ entries: [], history: emptyHistory<Entry>() });
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

  describe("undo/redo", () => {
    it("di default non c'è nulla da annullare/ripetere", () => {
      const s = useCalendarStore.getState();
      expect(canUndo(s.history)).toBe(false);
      expect(canRedo(s.history)).toBe(false);
    });

    it("undo annulla una creazione (elimina da DB e stato)", async () => {
      const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
      await useCalendarStore.getState().saveEntry(e);
      expect(canUndo(useCalendarStore.getState().history)).toBe(true);

      await useCalendarStore.getState().undo();

      expect(await db.entries.get("a")).toBeUndefined();
      expect(useCalendarStore.getState().entries).toEqual([]);
      expect(canRedo(useCalendarStore.getState().history)).toBe(true);
    });

    it("redo ripristina la creazione annullata", async () => {
      const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
      await useCalendarStore.getState().saveEntry(e);
      await useCalendarStore.getState().undo();

      await useCalendarStore.getState().redo();

      expect(await db.entries.get("a")).toEqual(e);
      expect(useCalendarStore.getState().entries.map((x) => x.id)).toEqual(["a"]);
    });

    it("undo di una modifica ripristina lo stato precedente", async () => {
      const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
      await useCalendarStore.getState().saveEntry(e);
      await useCalendarStore
        .getState()
        .saveEntry({ ...e, title: "modificata", updatedAt: 1 });

      await useCalendarStore.getState().undo();

      const after = useCalendarStore.getState().entries;
      expect(after).toHaveLength(1);
      expect(after[0].title).toBe("a");
      expect((await db.entries.get("a"))?.title).toBe("a");
    });

    it("undo di una eliminazione riporta indietro la entry", async () => {
      const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
      await useCalendarStore.getState().saveEntry(e);
      await useCalendarStore.getState().removeEntry("a");

      await useCalendarStore.getState().undo();

      expect(await db.entries.get("a")).toEqual(e);
      expect(useCalendarStore.getState().entries.map((x) => x.id)).toEqual(["a"]);
    });

    it("una nuova azione azzera il redo", async () => {
      const a = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
      const b = entry("b", "2026-06-13T09:00:00", "2026-06-13T10:00:00");
      await useCalendarStore.getState().saveEntry(a);
      await useCalendarStore.getState().undo();
      expect(canRedo(useCalendarStore.getState().history)).toBe(true);

      await useCalendarStore.getState().saveEntry(b);
      expect(canRedo(useCalendarStore.getState().history)).toBe(false);
    });

    it("loadRange non altera lo storico", async () => {
      const e = entry("a", "2026-06-12T09:00:00", "2026-06-12T10:00:00");
      await useCalendarStore.getState().saveEntry(e);

      await useCalendarStore
        .getState()
        .loadRange("2026-06-01T00:00:00", "2026-06-30T23:59:59");

      expect(canUndo(useCalendarStore.getState().history)).toBe(true);
    });
  });
});
