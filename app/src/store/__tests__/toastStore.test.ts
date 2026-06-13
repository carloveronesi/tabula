import { describe, it, expect, beforeEach, vi } from "vitest";
import { useToastStore } from "@/store/toast";

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe("useToastStore", () => {
  it("default: nessun toast", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("notify aggiunge un toast e ne restituisce l'id", () => {
    const id = useToastStore.getState().notify("Salvato");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].message).toBe("Salvato");
  });

  it("notify conserva azione e variante", () => {
    const run = vi.fn();
    useToastStore
      .getState()
      .notify("Eliminato", { action: { label: "Annulla", run }, variant: "danger" });
    const t = useToastStore.getState().toasts[0];
    expect(t.variant).toBe("danger");
    expect(t.action?.label).toBe("Annulla");
    t.action?.run();
    expect(run).toHaveBeenCalledOnce();
  });

  it("dismiss rimuove il toast indicato", () => {
    const a = useToastStore.getState().notify("A");
    const b = useToastStore.getState().notify("B");
    useToastStore.getState().dismiss(a);
    const ids = useToastStore.getState().toasts.map((t) => t.id);
    expect(ids).toEqual([b]);
  });

  it("più notify si accodano in ordine", () => {
    useToastStore.getState().notify("uno");
    useToastStore.getState().notify("due");
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual([
      "uno",
      "due",
    ]);
  });
});
