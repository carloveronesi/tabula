import { describe, it, expect } from "vitest";
import {
  emptyHistory,
  record,
  undo,
  redo,
  canUndo,
  canRedo,
  type Change,
} from "@/domain/history";

type Item = { id: string; v: number };

const change = (
  before: Item | null,
  after: Item | null,
): Change<Item> => ({ before, after });

describe("history (undo/redo puro)", () => {
  it("una history vuota non può fare undo né redo", () => {
    const h = emptyHistory<Item>();
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(undo(h)).toBeNull();
    expect(redo(h)).toBeNull();
  });

  it("record aggiunge un cambiamento allo stack e abilita l'undo", () => {
    const h = record(emptyHistory<Item>(), change(null, { id: "a", v: 1 }));
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
  });

  it("undo restituisce il cambiamento da invertire e lo sposta nel futuro", () => {
    const c = change({ id: "a", v: 1 }, { id: "a", v: 2 });
    const h = record(emptyHistory<Item>(), c);

    const result = undo(h);
    expect(result).not.toBeNull();
    // per annullare si applica lo stato "before"
    expect(result!.change.before).toEqual({ id: "a", v: 1 });
    expect(canUndo(result!.history)).toBe(false);
    expect(canRedo(result!.history)).toBe(true);
  });

  it("redo ripristina il cambiamento annullato applicando 'after'", () => {
    const c = change({ id: "a", v: 1 }, { id: "a", v: 2 });
    const afterUndo = undo(record(emptyHistory<Item>(), c))!.history;

    const result = redo(afterUndo);
    expect(result).not.toBeNull();
    expect(result!.change.after).toEqual({ id: "a", v: 2 });
    expect(canUndo(result!.history)).toBe(true);
    expect(canRedo(result!.history)).toBe(false);
  });

  it("un nuovo record dopo un undo azzera il futuro (no redo)", () => {
    const c1 = change(null, { id: "a", v: 1 });
    const c2 = change(null, { id: "b", v: 1 });
    const afterUndo = undo(record(emptyHistory<Item>(), c1))!.history;
    expect(canRedo(afterUndo)).toBe(true);

    const h = record(afterUndo, c2);
    expect(canRedo(h)).toBe(false);
    expect(canUndo(h)).toBe(true);
  });

  it("undo/redo multipli rispettano l'ordine LIFO", () => {
    let h = emptyHistory<Item>();
    h = record(h, change(null, { id: "a", v: 1 }));
    h = record(h, change(null, { id: "b", v: 1 }));

    const u1 = undo(h)!;
    expect(u1.change.before).toBeNull(); // annulla l'ultimo (b): "before" = non esisteva
    const u2 = undo(u1.history)!;
    expect(canUndo(u2.history)).toBe(false);

    const r1 = redo(u2.history)!;
    expect(r1.change.after).toEqual({ id: "a", v: 1 }); // riapplica nell'ordine inverso
  });
});
