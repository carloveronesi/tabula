import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekGrid } from "@/features/calendar/WeekGrid";
import type { WorkHours } from "@/domain/slots";

const WH: WorkHours = {
  morningStart: 540,
  morningEnd: 780,
  afternoonStart: 840,
  afternoonEnd: 1080,
};

// mercoledì 10 giu 2026 (settimana: lun 8 … dom 14)
const DATE = new Date(2026, 5, 10);

describe("WeekGrid", () => {
  it("una colonna per ogni giorno lavorativo (lun–ven → 5)", () => {
    render(<WeekGrid date={DATE} workingDays={[0, 1, 2, 3, 4]} workHours={WH} slotMinutes={30} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });

  it("rispetta un sottoinsieme di giorni lavorativi (lun/mer/ven → 3)", () => {
    render(<WeekGrid date={DATE} workingDays={[0, 2, 4]} workHours={WH} slotMinutes={30} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Lun 8", "Mer 10", "Ven 12"]);
  });

  it("mostra le righe degli slot orari (30 min → 16)", () => {
    render(<WeekGrid date={DATE} workingDays={[0, 1, 2, 3, 4]} workHours={WH} slotMinutes={30} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(16);
  });
});
