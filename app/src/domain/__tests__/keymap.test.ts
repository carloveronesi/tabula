import { describe, it, expect } from "vitest";
import { resolveKey, initialKeyState, type KeyInput } from "@/domain/keymap";

const key = (k: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

describe("keymap (scorciatoie pure)", () => {
  it("Ctrl+Z → undo", () => {
    const r = resolveKey(initialKeyState, key("z", { ctrlKey: true }));
    expect(r.action).toEqual({ type: "undo" });
  });

  it("Cmd+Z (meta) → undo", () => {
    const r = resolveKey(initialKeyState, key("z", { metaKey: true }));
    expect(r.action).toEqual({ type: "undo" });
  });

  it("Ctrl+Shift+Z → redo", () => {
    const r = resolveKey(initialKeyState, key("z", { ctrlKey: true, shiftKey: true }));
    expect(r.action).toEqual({ type: "redo" });
  });

  it("Ctrl+Y → redo", () => {
    const r = resolveKey(initialKeyState, key("y", { ctrlKey: true }));
    expect(r.action).toEqual({ type: "redo" });
  });

  it("Ctrl+K → ricerca", () => {
    const r = resolveKey(initialKeyState, key("k", { ctrlKey: true }));
    expect(r.action).toEqual({ type: "view", view: "search" });
  });

  it("n → nuova attività", () => {
    const r = resolveKey(initialKeyState, key("n"));
    expect(r.action).toEqual({ type: "new" });
  });

  it("t → toggle del timer", () => {
    const r = resolveKey(initialKeyState, key("t"));
    expect(r.action).toEqual({ type: "timer" });
  });

  it("la sequenza g poi d apre la vista Giorno", () => {
    const first = resolveKey(initialKeyState, key("g"));
    expect(first.action).toBeNull();
    expect(first.state.prefix).toBe("g");

    const second = resolveKey(first.state, key("d"));
    expect(second.action).toEqual({ type: "view", view: "day" });
    expect(second.state.prefix).toBeNull();
  });

  it("g poi w / m aprono Settimana / Mese", () => {
    const w = resolveKey({ prefix: "g" }, key("w"));
    expect(w.action).toEqual({ type: "view", view: "week" });
    const m = resolveKey({ prefix: "g" }, key("m"));
    expect(m.action).toEqual({ type: "view", view: "month" });
  });

  it("g seguito da un tasto non mappato non fa nulla e azzera il prefisso", () => {
    const r = resolveKey({ prefix: "g" }, key("q"));
    expect(r.action).toBeNull();
    expect(r.state.prefix).toBeNull();
  });

  it("un tasto qualsiasi senza prefisso/modificatori non produce azioni", () => {
    const r = resolveKey(initialKeyState, key("x"));
    expect(r.action).toBeNull();
    expect(r.state.prefix).toBeNull();
  });

  it("Ctrl+Z mentre è attivo il prefisso 'g' lo azzera ed esegue undo", () => {
    const r = resolveKey({ prefix: "g" }, key("z", { ctrlKey: true }));
    expect(r.action).toEqual({ type: "undo" });
    expect(r.state.prefix).toBeNull();
  });
});
