import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DaySummary } from "@/features/calendar/DaySummary";

const empty = { totalMin: 0, count: 0, rows: [] };

describe("DaySummary", () => {
  it("dice 'Oggi' solo quando il giorno è oggi", () => {
    const { rerender } = render(<DaySummary breakdown={empty} onAdd={() => {}} isToday />);
    expect(screen.getByText("Oggi registrato")).toBeTruthy();
    rerender(<DaySummary breakdown={empty} onAdd={() => {}} />);
    expect(screen.getByText("Registrato")).toBeTruthy();
  });

  it("nei giorni non lavorativi non suggerisce la sede predefinita", () => {
    const props = {
      breakdown: empty,
      onAdd: () => {},
      presenceEnabled: true,
      onSetLocation: () => {},
      suggestedLocation: "remote" as const,
    };
    const { rerender } = render(<DaySummary {...props} expectedMin={480} />);
    expect(screen.queryByLabelText(/predefinita/)).not.toBeNull();
    rerender(<DaySummary {...props} expectedMin={0} />);
    expect(screen.queryByLabelText(/predefinita/)).toBeNull();
  });
});
