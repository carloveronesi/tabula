import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthGrid } from "@/features/calendar/MonthGrid";

const DATE = new Date(2026, 5, 15); // giugno 2026

describe("MonthGrid", () => {
  it("renderizza 42 celle (6×7)", () => {
    render(<MonthGrid date={DATE} />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
  });

  it("intestazioni dei 7 giorni della settimana", () => {
    render(<MonthGrid date={DATE} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.getByText("Lun")).toBeInTheDocument();
    expect(screen.getByText("Dom")).toBeInTheDocument();
  });

  it("marca i giorni fuori dal mese corrente", () => {
    render(<MonthGrid date={new Date(2026, 6, 15)} />); // luglio: prime celle a giugno
    const cells = screen.getAllByRole("gridcell");
    expect(cells[0]).toHaveAttribute("data-outside", "true"); // 29 giu
    expect(cells[2]).toHaveAttribute("data-outside", "false"); // 1 lug
  });
});
