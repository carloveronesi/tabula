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
    for (const label of ["Calendario", "Mese", "Progetti", "Todo", "Ricerca", "Impostazioni"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("Mese apre la vista mensile ed è l'unica voce attiva lì", () => {
    useUiStore.setState({ view: "day" });
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Mese" }));
    expect(useUiStore.getState().view).toBe("month");
    expect(screen.getByRole("button", { name: "Mese" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute("aria-pressed", "false");
  });

  it("cambia vista al click su una sezione", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Progetti" }));
    expect(useUiStore.getState().view).toBe("projects");
  });

  it.each(["day", "week"] as const)(
    "Calendario è attivo in %s e porta al Giorno",
    (view) => {
      useUiStore.setState({ view });
      render(<Sidebar />);
      expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
      expect(useUiStore.getState().view).toBe("day");
    },
  );

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
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
