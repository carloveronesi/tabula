import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Sidebar } from "@/features/layout/Sidebar";
import { useUiStore } from "@/store";

beforeEach(() => {
  useUiStore.setState({ view: "month", summary: false, activeDate: new Date(2026, 5, 15) });
});

describe("Sidebar", () => {
  it("espone la navigazione tra sezioni", () => {
    render(<Sidebar />);
    expect(screen.getByRole("navigation", { name: "Sezioni" })).toBeInTheDocument();
    for (const label of ["Calendario", "Riepilogo", "Progetti", "Da fare", "Ricerca", "Impostazioni"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("Riepilogo apre il Mese ed è l'unica voce attiva lì", () => {
    useUiStore.setState({ view: "day" });
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Riepilogo" }));
    expect(useUiStore.getState().view).toBe("month");
    expect(screen.getByRole("button", { name: "Riepilogo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute("aria-pressed", "false");
  });

  it("il Mese aperto dallo switch del calendario lascia attivo Calendario", () => {
    useUiStore.setState({ view: "day" });
    render(<Sidebar />);
    act(() => useUiStore.getState().setView("month"));
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Riepilogo" })).toHaveAttribute("aria-pressed", "false");
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

  it("rientrando nel Calendario da un'altra sezione riparte da oggi", () => {
    useUiStore.setState({ view: "todo", activeDate: new Date(2026, 8, 5) });
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    expect(useUiStore.getState().view).toBe("day");
    expect(useUiStore.getState().activeDate.toDateString()).toBe(new Date().toDateString());
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
    expect(screen.getByRole("button", { name: "Da fare" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Calendario" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
