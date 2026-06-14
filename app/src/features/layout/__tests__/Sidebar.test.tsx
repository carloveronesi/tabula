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

  it("Calendario porta alla vista Giorno e resta attivo per giorno/settimana/mese", () => {
    render(<Sidebar />);
    // attiva in vista mese (gruppo calendario)
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    expect(useUiStore.getState().view).toBe("day");
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
