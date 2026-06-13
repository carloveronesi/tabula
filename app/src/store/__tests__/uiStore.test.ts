import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "@/store";

const D = (y: number, m0: number, d: number) => new Date(y, m0, d);

beforeEach(() => {
  useUiStore.setState({ view: "month", activeDate: D(2026, 5, 15) });
});

describe("useUiStore", () => {
  it("setView cambia vista", () => {
    useUiStore.getState().setView("week");
    expect(useUiStore.getState().view).toBe("week");
  });

  it("setActiveDate imposta la data focale", () => {
    useUiStore.getState().setActiveDate(D(2026, 0, 1));
    expect(useUiStore.getState().activeDate).toEqual(D(2026, 0, 1));
  });

  it("goNext in vista mese → +1 mese", () => {
    useUiStore.getState().goNext();
    expect(useUiStore.getState().activeDate).toEqual(D(2026, 6, 15));
  });

  it("goPrev in vista giorno → -1 giorno", () => {
    useUiStore.setState({ view: "day" });
    useUiStore.getState().goPrev();
    expect(useUiStore.getState().activeDate).toEqual(D(2026, 5, 14));
  });

  it("goToday → data odierna", () => {
    useUiStore.getState().goToday();
    const t = useUiStore.getState().activeDate;
    const now = new Date();
    expect([t.getFullYear(), t.getMonth(), t.getDate()]).toEqual([
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ]);
  });
});
