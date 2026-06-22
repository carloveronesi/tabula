import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/data/db";
import { useTimerStore } from "@/store/timer";

beforeEach(async () => {
  await db.timer.clear();
  useTimerStore.setState({ startedAt: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTimerStore", () => {
  it("default: nessun timer in corso", () => {
    expect(useTimerStore.getState().startedAt).toBeNull();
  });

  it("start avvia il conteggio e lo persiste", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    await useTimerStore.getState().start();

    expect(useTimerStore.getState().startedAt).toBe(1000);
    expect(await db.timer.get("active")).toEqual({ id: "active", startedAt: 1000 });
  });

  it("start è no-op se un timer è già in corso", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    await useTimerStore.getState().start();

    now.mockReturnValue(5000);
    await useTimerStore.getState().start();

    expect(useTimerStore.getState().startedAt).toBe(1000); // non riavviato
  });

  it("load ripristina il timer persistito", async () => {
    await db.timer.put({ id: "active", startedAt: 4242 });

    await useTimerStore.getState().load();

    expect(useTimerStore.getState().startedAt).toBe(4242);
  });

  it("load senza timer persistito lascia null", async () => {
    await useTimerStore.getState().load();
    expect(useTimerStore.getState().startedAt).toBeNull();
  });

  it("stop restituisce la fascia avvio/stop e azzera DB e stato", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    await useTimerStore.getState().start();

    now.mockReturnValue(3000);
    const range = await useTimerStore.getState().stop();

    expect(range).toEqual({ startedAt: 1000, stoppedAt: 3000 });
    expect(useTimerStore.getState().startedAt).toBeNull();
    expect(await db.timer.get("active")).toBeUndefined();
  });

  it("stop a timer fermo restituisce null", async () => {
    expect(await useTimerStore.getState().stop()).toBeNull();
  });

  it("cancel azzera senza restituire nulla", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    await useTimerStore.getState().start();

    await useTimerStore.getState().cancel();

    expect(useTimerStore.getState().startedAt).toBeNull();
    expect(await db.timer.get("active")).toBeUndefined();
  });
});
