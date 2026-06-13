import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayView } from "@/features/calendar/DayView";
import type { Entry, ISODateTime } from "@/data/types";
import type { WorkHours } from "@/domain/slots";

const WH: WorkHours = {
  morningStart: 540,
  morningEnd: 780,
  afternoonStart: 840,
  afternoonEnd: 1080,
};

function entry(
  id: string,
  startsAt: ISODateTime,
  endsAt: ISODateTime,
  title: string,
): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title,
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("DayView", () => {
  it("un blocco per ogni entry del giorno, posizionato sulla griglia", () => {
    const date = new Date(2026, 5, 10);
    const entries = [
      entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00", "Call"),
      entry("x", "2026-06-11T09:00:00", "2026-06-11T10:00:00", "Altro giorno"),
    ];
    render(<DayView date={date} entries={entries} workHours={WH} slotMinutes={30} />);

    const blocks = screen.getAllByTestId("entry-block");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveTextContent("Call");
    expect(blocks[0]).toHaveAttribute("data-start-row", "0");
    expect(blocks[0]).toHaveAttribute("data-span", "2");
  });

  it("nessuna entry → nessun blocco, ma la griglia c'è", () => {
    render(<DayView date={new Date(2026, 5, 10)} entries={[]} workHours={WH} slotMinutes={30} />);
    expect(screen.queryAllByTestId("entry-block")).toHaveLength(0);
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("posiziona un blocco pomeridiano", () => {
    const date = new Date(2026, 5, 10);
    const entries = [entry("p", "2026-06-10T14:00:00", "2026-06-10T15:00:00", "Pom")];
    render(<DayView date={date} entries={entries} workHours={WH} slotMinutes={30} />);
    const block = screen.getByTestId("entry-block");
    expect(block).toHaveAttribute("data-start-row", "8");
    expect(block).toHaveAttribute("data-span", "2");
  });
});
