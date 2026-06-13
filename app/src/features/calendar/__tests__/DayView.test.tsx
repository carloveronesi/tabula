import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DayView } from "@/features/calendar/DayView";
import type { Entry, ISODateTime } from "@/data/types";
import type { WorkHours } from "@/domain/slots";

const SLOT_H = 44; // = DayGrid.SLOT_HEIGHT

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

  it("drag su area vuota → onCreateRange con l'intervallo", () => {
    const onCreateRange = vi.fn();
    render(
      <DayView
        date={new Date(2026, 5, 10)}
        entries={[]}
        workHours={WH}
        slotMinutes={30}
        onCreateRange={onCreateRange}
      />,
    );
    const area = screen.getByTestId("day-area");
    fireEvent.pointerDown(area, { clientY: 0, pointerId: 1 }); // riga 0 (09:00)
    fireEvent.pointerMove(area, { clientY: SLOT_H * 3, pointerId: 1 }); // riga 3
    fireEvent.pointerUp(area, { pointerId: 1 });
    // righe 0..3 → 09:00 (540) … fine riga 3 (630+30 = 660)
    expect(onCreateRange).toHaveBeenCalledWith(540, 660);
  });

  it("drag di un blocco → onUpdateEntry col nuovo orario", () => {
    const onUpdateEntry = vi.fn();
    const e = entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00", "Call");
    render(
      <DayView
        date={new Date(2026, 5, 10)}
        entries={[e]}
        workHours={WH}
        slotMinutes={30}
        onUpdateEntry={onUpdateEntry}
      />,
    );
    const block = screen.getByTestId("entry-block");
    const area = screen.getByTestId("day-area");
    fireEvent.pointerDown(block, { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(area, { clientY: SLOT_H, pointerId: 1 }); // +1 riga
    fireEvent.pointerUp(area, { pointerId: 1 });
    // 09:00–10:00 spostato di +30' → 09:30 (570) – 10:30 (630)
    expect(onUpdateEntry).toHaveBeenCalledWith(e, 570, 630);
  });

  it("click su un blocco (senza movimento) → onSelectEntry", () => {
    const onSelectEntry = vi.fn();
    const onUpdateEntry = vi.fn();
    const e = entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00", "Call");
    render(
      <DayView
        date={new Date(2026, 5, 10)}
        entries={[e]}
        workHours={WH}
        slotMinutes={30}
        onSelectEntry={onSelectEntry}
        onUpdateEntry={onUpdateEntry}
      />,
    );
    const block = screen.getByTestId("entry-block");
    const area = screen.getByTestId("day-area");
    fireEvent.pointerDown(block, { clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(area, { pointerId: 1 });
    expect(onSelectEntry).toHaveBeenCalledWith(e);
    expect(onUpdateEntry).not.toHaveBeenCalled();
  });

  it("resize dal bordo inferiore → onUpdateEntry con durata maggiore", () => {
    const onUpdateEntry = vi.fn();
    const e = entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00", "Call");
    render(
      <DayView
        date={new Date(2026, 5, 10)}
        entries={[e]}
        workHours={WH}
        slotMinutes={30}
        onUpdateEntry={onUpdateEntry}
      />,
    );
    const handle = screen.getByTestId("resize-bottom");
    const area = screen.getByTestId("day-area");
    fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(area, { clientY: SLOT_H, pointerId: 1 }); // +1 riga in fondo
    fireEvent.pointerUp(area, { pointerId: 1 });
    // 09:00 invariato, fine estesa di 30' → 540 … 630
    expect(onUpdateEntry).toHaveBeenCalledWith(e, 540, 630);
  });
});
