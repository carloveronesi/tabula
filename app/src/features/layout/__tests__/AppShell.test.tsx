import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "@/features/layout/AppShell";
import { db } from "@/data/db";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";
import { useEditorStore } from "@/store/editor";

beforeEach(async () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  await db.entries.clear();
  await db.settings.clear();
  useUiStore.setState({ view: "month", activeDate: new Date(2026, 5, 15) });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
  useCalendarStore.setState({ entries: [] });
  useEditorStore.setState({ open: false, base: null, detail: null });
});

describe("AppShell", () => {
  it("monta la barra superiore", () => {
    render(<AppShell />);
    expect(screen.getByText("Oggi")).toBeInTheDocument();
  });

  it("mostra il contenuto della vista attiva (mese di default)", () => {
    render(<AppShell />);
    expect(screen.getByTestId("view-month")).toBeInTheDocument();
  });

  it("cambia il contenuto quando cambia la vista", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByText("Settimana"));
    expect(screen.getByTestId("view-week")).toBeInTheDocument();
    expect(screen.queryByTestId("view-month")).not.toBeInTheDocument();
  });

  it("la vista Giorno mostra la griglia oraria", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByText("Giorno"));
    expect(screen.getByTestId("view-day")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument(); // primo slot di default
  });

  it("la vista Settimana mostra una colonna per giorno lavorativo", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByText("Settimana"));
    expect(screen.getAllByRole("columnheader")).toHaveLength(5); // lun–ven di default
  });

  it("la sequenza g→d cambia vista a Giorno da tastiera", () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "d" });
    expect(useUiStore.getState().view).toBe("day");
  });

  it("Ctrl+K apre la Ricerca da tastiera", () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(useUiStore.getState().view).toBe("search");
  });

  it("'n' apre l'editor per una nuova attività", () => {
    render(<AppShell />);
    fireEvent.keyDown(window, { key: "n" });
    expect(useEditorStore.getState().open).toBe(true);
    expect(useEditorStore.getState().base).toBeNull();
  });

  it("le scorciatoie sono inerti mentre si digita in un campo", () => {
    render(<AppShell />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "n" });
    expect(useEditorStore.getState().open).toBe(false);
    input.remove();
  });
});
