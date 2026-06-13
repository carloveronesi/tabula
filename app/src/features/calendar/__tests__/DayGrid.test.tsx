import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayGrid } from "@/features/calendar/DayGrid";
import type { WorkHours } from "@/domain/slots";

const WH: WorkHours = {
  morningStart: 540,
  morningEnd: 780,
  afternoonStart: 840,
  afternoonEnd: 1080,
};

describe("DayGrid", () => {
  it("una riga per ogni slot lavorativo (30 min → 16)", () => {
    render(<DayGrid workHours={WH} slotMinutes={30} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(16);
  });

  it("mostra le etichette orarie", () => {
    render(<DayGrid workHours={WH} slotMinutes={30} />);
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("14:00")).toBeInTheDocument();
    expect(screen.getByText("17:30")).toBeInTheDocument();
  });

  it("rispetta slotMinutes (15 min → 32 slot)", () => {
    render(<DayGrid workHours={WH} slotMinutes={15} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(32);
  });
});
