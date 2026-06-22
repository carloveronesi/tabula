import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "@/store/editor";
import type { Entry } from "@/data/types";

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    startsAt: "2026-06-12T09:00:00",
    endsAt: "2026-06-12T10:00:00",
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: "Call",
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

beforeEach(() => {
  useEditorStore.setState({
    open: false,
    base: null,
    detail: null,
    clipboard: null,
  });
});

describe("useEditorStore", () => {
  it("openCreate apre l'editor senza base e con il seed", () => {
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 });
    const s = useEditorStore.getState();
    expect(s.open).toBe(true);
    expect(s.base).toBeNull();
    expect(s.seed).toEqual({ date: "2026-06-12", startMin: 540, endMin: 600 });
  });

  it("openEdit apre l'editor con la entry come base e chiude il dettaglio", () => {
    const e = entry();
    useEditorStore.getState().showDetail(e);
    useEditorStore.getState().openEdit(e);
    const s = useEditorStore.getState();
    expect(s.open).toBe(true);
    expect(s.base).toBe(e);
    expect(s.detail).toBeNull();
  });

  it("close chiude l'editor e azzera la base", () => {
    useEditorStore.getState().openEdit(entry());
    useEditorStore.getState().close();
    const s = useEditorStore.getState();
    expect(s.open).toBe(false);
    expect(s.base).toBeNull();
  });

  it("showDetail/hideDetail gestiscono il pannello dettaglio", () => {
    const e = entry();
    useEditorStore.getState().showDetail(e);
    expect(useEditorStore.getState().detail).toBe(e);
    useEditorStore.getState().hideDetail();
    expect(useEditorStore.getState().detail).toBeNull();
  });

  it("copyEntry mette la entry negli appunti", () => {
    const e = entry();
    useEditorStore.getState().copyEntry(e);
    expect(useEditorStore.getState().clipboard).toBe(e);
  });
});
