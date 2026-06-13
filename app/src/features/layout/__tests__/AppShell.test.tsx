import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "@/features/layout/AppShell";
import { db } from "@/data/db";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { useCalendarStore } from "@/store/calendar";

beforeEach(async () => {
  await db.entries.clear();
  await db.settings.clear();
  useUiStore.setState({ view: "month", activeDate: new Date(2026, 5, 15) });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
  useCalendarStore.setState({ entries: [] });
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
});
