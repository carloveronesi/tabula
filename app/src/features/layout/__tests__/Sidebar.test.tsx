import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/features/layout/Sidebar";
import { useUiStore } from "@/store";

beforeEach(() => {
  useUiStore.setState({ view: "month", activeDate: new Date(2026, 5, 15) });
});

describe("Sidebar", () => {
  it("espone la navigazione tra sezioni", () => {
    render(<Sidebar />);
    expect(screen.getByRole("navigation", { name: "Sezioni" })).toBeInTheDocument();
    for (const label of ["Calendario", "Riepilogo", "Progetti", "Todo", "Ricerca", "Impostazioni"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("cambia vista al click su una sezione", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Progetti" }));
    expect(useUiStore.getState().view).toBe("projects");
  });

  it("Calendario è attivo per giorno/settimana e porta al Giorno", () => {
    useUiStore.setState({ view: "week" });
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    expect(useUiStore.getState().view).toBe("day");
  });

  it("Riepilogo è attivo nel Mese e ci porta direttamente", () => {
    useUiStore.setState({ view: "todo" });
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Riepilogo" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Riepilogo" }));
    expect(useUiStore.getState().view).toBe("month");
  });

  it("Aiuto apre il pannello senza cambiare vista", () => {
    render(<Sidebar />);
    expect(screen.queryByText("Il flusso di una giornata")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aiuto" }));

    expect(screen.getByText("Il flusso di una giornata")).toBeInTheDocument();
    // Le scorciatoie arrivano da SHORTCUTS: se la lista si svuota, qui si vede.
    expect(screen.getByText("Avvia o ferma il timer")).toBeInTheDocument();
    expect(useUiStore.getState().view).toBe("month");
  });

  it("marca la sezione attiva con aria-pressed", () => {
    useUiStore.setState({ view: "todo" });
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Todo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Riepilogo" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
