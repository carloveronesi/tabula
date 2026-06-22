import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MonthGrid } from "@/features/calendar/MonthGrid";
import type { Entry, ISODateTime } from "@/data/types";

const DATE = new Date(2026, 5, 15); // giugno 2026

function entry(id: string, startsAt: ISODateTime): Entry {
  return {
    id,
    startsAt,
    endsAt: startsAt,
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: id,
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

  it("mostra un puntino per attività e il conteggio via aria-label", () => {
    const entries = [
      entry("a", "2026-06-15T09:00:00"),
      entry("b", "2026-06-15T11:00:00"),
    ];
    render(<MonthGrid date={DATE} entries={entries} />);
    // un puntino per attività, col titolo nel tooltip
    expect(screen.getByTitle("a")).toBeInTheDocument();
    expect(screen.getByTitle("b")).toBeInTheDocument();
    // conteggio accessibile (non solo colore)
    expect(screen.getByLabelText("15: 2 attività")).toBeInTheDocument();
  });

  it("elenca i nomi delle attività del giorno (fino al massimo, poi +N)", () => {
    const entries = Array.from({ length: 4 }, (_, i) =>
      entry(`Task ${i}`, `2026-06-15T${String(9 + i).padStart(2, "0")}:00:00`),
    );
    render(<MonthGrid date={DATE} entries={entries} />);
    expect(screen.getByText("Task 0")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
    // il quarto eccede MAX_NAMES (3): non c'è il nome, ma il contatore "+1"
    expect(screen.queryByText("Task 3")).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("colora i puntini secondo colorOf", () => {
    const entries = [entry("a", "2026-06-15T09:00:00")];
    render(
      <MonthGrid date={DATE} entries={entries} colorOf={() => "#ff0000"} />,
    );
    expect(screen.getByTitle("a")).toHaveStyle({ backgroundColor: "#ff0000" });
  });

  it("col filtro attivo evidenzia i giorni che corrispondono e sfuma gli altri", () => {
    const a = { ...entry("a", "2026-06-15T09:00:00"), clientId: "c1" };
    const b = { ...entry("b", "2026-06-16T09:00:00"), clientId: "c2" };
    render(
      <MonthGrid
        date={DATE}
        entries={[a, b]}
        highlight={{ kind: "client", clientId: "c1" }}
      />,
    );
    const cell15 = screen.getByText("15").closest('[role="gridcell"]');
    const cell16 = screen.getByText("16").closest('[role="gridcell"]');
    expect(cell15).toHaveAttribute("data-dimmed", "false");
    expect(cell16).toHaveAttribute("data-dimmed", "true");
  });

  it("mostra l'icona della sede sui giorni con una location", () => {
    render(<MonthGrid date={DATE} locations={{ "2026-06-15": "office" }} />);
    expect(screen.getByLabelText("Ufficio")).toBeInTheDocument();
  });

  it("col filtro per sede evidenzia i giorni con quella sede", () => {
    render(
      <MonthGrid
        date={DATE}
        locations={{ "2026-06-15": "office", "2026-06-16": "remote" }}
        highlight={{ kind: "location", location: "office" }}
      />,
    );
    expect(
      screen.getByText("15").closest('[role="gridcell"]'),
    ).toHaveAttribute("data-dimmed", "false");
    expect(
      screen.getByText("16").closest('[role="gridcell"]'),
    ).toHaveAttribute("data-dimmed", "true");
  });

  it("il click su un giorno chiama onOpenDay con quella data", () => {
    const onOpenDay = vi.fn();
    render(<MonthGrid date={DATE} onOpenDay={onOpenDay} />);
    fireEvent.click(screen.getByText("15"));
    expect(onOpenDay).toHaveBeenCalledOnce();
    const arg = onOpenDay.mock.calls[0][0] as Date;
    expect(arg.getDate()).toBe(15);
    expect(arg.getMonth()).toBe(5);
  });
});
