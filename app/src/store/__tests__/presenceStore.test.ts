import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/data/db";
import { usePresenceStore } from "@/store/presence";

beforeEach(async () => {
  await db.days.clear();
  usePresenceStore.setState({ metas: {} });
});

describe("usePresenceStore", () => {
  it("default: nessuna sede registrata", () => {
    expect(usePresenceStore.getState().metas).toEqual({});
  });

  it("loadRange carica solo i giorni con sede nel periodo", async () => {
    await db.days.bulkPut([
      { date: "2026-06-01", location: "office" },
      { date: "2026-06-02", location: null }, // senza sede: ignorato
      { date: "2026-06-03", location: "client" },
      { date: "2026-05-31", location: "remote" }, // fuori periodo
    ]);

    await usePresenceStore.getState().loadRange("2026-06-01", "2026-06-30");

    expect(usePresenceStore.getState().metas).toEqual({
      "2026-06-01": "office",
      "2026-06-03": "client",
    });
  });

  it("setLocation scrive la sede (DB + store)", async () => {
    await usePresenceStore.getState().setLocation("2026-06-10", "office");

    expect(usePresenceStore.getState().metas["2026-06-10"]).toBe("office");
    expect(await db.days.get("2026-06-10")).toEqual({
      date: "2026-06-10",
      location: "office",
    });
  });

  it("setLocation aggiorna una sede esistente senza duplicarla", async () => {
    await usePresenceStore.getState().setLocation("2026-06-10", "office");
    await usePresenceStore.getState().setLocation("2026-06-10", "remote");

    expect(usePresenceStore.getState().metas["2026-06-10"]).toBe("remote");
    expect(await db.days.count()).toBe(1);
  });

  it("setLocation con null cancella la sede (DB + store)", async () => {
    await usePresenceStore.getState().setLocation("2026-06-10", "office");
    await usePresenceStore.getState().setLocation("2026-06-10", null);

    expect(usePresenceStore.getState().metas).toEqual({});
    expect(await db.days.get("2026-06-10")).toBeUndefined();
  });

  it("setLocation con null lascia intatte le altre sedi", async () => {
    await usePresenceStore.getState().setLocation("2026-06-10", "office");
    await usePresenceStore.getState().setLocation("2026-06-11", "client");
    await usePresenceStore.getState().setLocation("2026-06-10", null);

    expect(usePresenceStore.getState().metas).toEqual({ "2026-06-11": "client" });
  });
});
