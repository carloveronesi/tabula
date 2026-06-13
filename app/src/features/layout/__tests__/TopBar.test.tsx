import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopBar } from "@/features/layout/TopBar";
import { useUiStore } from "@/store";

beforeEach(() => {
  useUiStore.setState({ view: "month", activeDate: new Date(2026, 5, 15) });
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
});
