import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopBar } from "@/features/layout/TopBar";
import { useUiStore } from "@/store";
import { useCalendarStore } from "@/store/calendar";
import { emptyHistory, record } from "@/domain/history";
import type { Entry } from "@/data/types";

beforeEach(() => {
  useUiStore.setState({ view: "month", activeDate: new Date(2026, 5, 15) });
  useCalendarStore.setState({ entries: [], history: emptyHistory<Entry>() });
});

describe("TopBar", () => {
  it("cambia vista al click sul relativo bottone", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByText("Settimana"));
    expect(useUiStore.getState().view).toBe("week");
  });

  it("Successivo avanza la data focale (in vista mese: +1 mese)", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByLabelText("Successivo"));
    expect(useUiStore.getState().activeDate).toEqual(new Date(2026, 6, 15));
  });

  it("Precedente arretra la data focale", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByLabelText("Precedente"));
    expect(useUiStore.getState().activeDate).toEqual(new Date(2026, 4, 15));
  });

  it("Oggi riporta alla data odierna", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByText("Oggi"));
    expect(useUiStore.getState().activeDate.getMonth()).toBe(new Date().getMonth());
  });

  it("evidenzia la vista attiva via aria-pressed", () => {
    render(<TopBar />);
    expect(screen.getByText("Mese")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Giorno")).toHaveAttribute("aria-pressed", "false");
  });

  it("Annulla/Ripeti sono disabilitati senza storico", () => {
    render(<TopBar />);
    expect(screen.getByLabelText("Annulla")).toBeDisabled();
    expect(screen.getByLabelText("Ripeti")).toBeDisabled();
  });

  it("Annulla si abilita quando c'è qualcosa da annullare", () => {
    useCalendarStore.setState({
      history: record(emptyHistory<Entry>(), { before: null, after: {} as Entry }),
    });
    render(<TopBar />);
    expect(screen.getByLabelText("Annulla")).not.toBeDisabled();
  });

  it("la Ricerca espone l'hint della scorciatoia nel tooltip", () => {
    render(<TopBar />);
    expect(screen.getByLabelText("Ricerca")).toHaveAttribute(
      "title",
      "Ricerca (Ctrl+K)",
    );
  });
});
