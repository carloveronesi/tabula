import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TimerControl } from "@/features/layout/TimerControl";
import { db } from "@/data/db";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { useTimerStore } from "@/store/timer";
import { useEditorStore } from "@/store/editor";
import { useSettingsStore } from "@/store/settings";

beforeEach(async () => {
  await db.timer.clear();
  useTimerStore.setState({ startedAt: null });
  useEditorStore.setState({ open: false, base: null, detail: null });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("TimerControl", () => {
  it("da fermo mostra il pulsante di avvio", () => {
    render(<TimerControl />);
    expect(screen.getByText("Timer")).toBeInTheDocument();
    expect(screen.queryByText("Ferma")).not.toBeInTheDocument();
  });

  it("avvia il timer al click e passa allo stato 'in corso'", async () => {
    render(<TimerControl />);
    fireEvent.click(screen.getByText("Timer"));
    await waitFor(() =>
      expect(useTimerStore.getState().startedAt).not.toBeNull(),
    );
    expect(await screen.findByText("Ferma")).toBeInTheDocument();
    // Persistito su IndexedDB per sopravvivere a reload.
    expect(await db.timer.get("active")).toBeDefined();
  });

  it("lo stop ferma il timer e apre l'editor sulla fascia", async () => {
    // Timer avviato ~85 minuti fa.
    useTimerStore.setState({ startedAt: Date.now() - 85 * 60_000 });
    render(<TimerControl />);

    fireEvent.click(screen.getByText("Ferma"));

    await waitFor(() =>
      expect(useEditorStore.getState().open).toBe(true),
    );
    expect(useTimerStore.getState().startedAt).toBeNull();
    expect(useEditorStore.getState().base).toBeNull();
    // Editor pre-compilato con una fascia non vuota.
    const seed = useEditorStore.getState().seed;
    expect(seed.endMin).toBeGreaterThan(seed.startMin);
  });

  it("annulla il timer senza aprire l'editor", async () => {
    useTimerStore.setState({ startedAt: Date.now() - 10 * 60_000 });
    render(<TimerControl />);

    fireEvent.click(screen.getByLabelText("Annulla timer"));

    await waitFor(() =>
      expect(useTimerStore.getState().startedAt).toBeNull(),
    );
    expect(useEditorStore.getState().open).toBe(false);
  });
});
