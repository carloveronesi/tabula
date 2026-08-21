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

/**
 * jsdom non fa layout: senza un rect finto `cellAt` non sa dov'è nessuna cella.
 * Griglia 700×600 all'origine ⇒ celle da 100×100, indice = riga*7 + colonna.
 */
function mockGrid() {
  const spy = vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockReturnValue({
      left: 0,
      top: 0,
      width: 700,
      height: 600,
      right: 700,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  return () => spy.mockRestore();
}

/** Centro della cella `i` nella griglia finta. */
const at = (i: number) => ({
  clientX: (i % 7) * 100 + 50,
  clientY: Math.floor(i / 7) * 100 + 50,
});

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

  describe("selezione multi-giorno", () => {
    it("trascinando su più celle chiede la creazione sull'intervallo", () => {
      const restore = mockGrid();
      const onCreateSpan = vi.fn();
      const onOpenDay = vi.fn();
      const { container } = render(
        <MonthGrid date={DATE} onCreateSpan={onCreateSpan} onOpenDay={onOpenDay} />,
      );
      const grid = container.querySelector(".grid-rows-6")!;
      const cells = screen.getAllByRole("gridcell");

      // celle 0..4 = lun 1 giu → ven 5 giu 2026
      fireEvent.pointerDown(grid, { button: 0, ...at(0) });
      fireEvent.pointerMove(grid, at(4));
      fireEvent.pointerUp(grid, at(4));

      expect(onCreateSpan).toHaveBeenCalledTimes(1);
      const [from, to] = onCreateSpan.mock.calls[0];
      expect(from).toEqual(new Date(2026, 5, 1));
      expect(to).toEqual(new Date(2026, 5, 5));

      // il click che segue il rilascio non deve anche aprire il giorno
      fireEvent.click(cells[0]);
      expect(onOpenDay).not.toHaveBeenCalled();
      restore();
    });

    it("trascinando all'indietro l'intervallo resta ordinato", () => {
      const restore = mockGrid();
      const onCreateSpan = vi.fn();
      const { container } = render(
        <MonthGrid date={DATE} onCreateSpan={onCreateSpan} />,
      );
      const grid = container.querySelector(".grid-rows-6")!;

      fireEvent.pointerDown(grid, { button: 0, ...at(4) });
      fireEvent.pointerMove(grid, at(0));
      fireEvent.pointerUp(grid, at(0));

      const [from, to] = onCreateSpan.mock.calls[0];
      expect(from).toEqual(new Date(2026, 5, 1));
      expect(to).toEqual(new Date(2026, 5, 5));
      restore();
    });

    it("dopo un trascinamento il giorno resta apribile", async () => {
      const restore = mockGrid();
      const onOpenDay = vi.fn();
      const { container } = render(
        <MonthGrid date={DATE} onCreateSpan={vi.fn()} onOpenDay={onOpenDay} />,
      );
      const grid = container.querySelector(".grid-rows-6")!;

      fireEvent.pointerDown(grid, { button: 0, ...at(0) });
      fireEvent.pointerMove(grid, at(4));
      fireEvent.pointerUp(grid, at(4));
      // dopo un trascinamento il click non arriva: il paraurti si abbassa da sé,
      // altrimenti si mangerebbe il primo Invio da tastiera su una cella.
      await new Promise((r) => setTimeout(r, 0));

      fireEvent.click(screen.getAllByRole("gridcell")[10]);
      expect(onOpenDay).toHaveBeenCalledTimes(1);
      restore();
    });

    it("un click secco apre il giorno e non crea niente", () => {
      const restore = mockGrid();
      const onCreateSpan = vi.fn();
      const onOpenDay = vi.fn();
      const { container } = render(
        <MonthGrid date={DATE} onCreateSpan={onCreateSpan} onOpenDay={onOpenDay} />,
      );
      const grid = container.querySelector(".grid-rows-6")!;

      fireEvent.pointerDown(grid, { button: 0, ...at(14) });
      fireEvent.pointerUp(grid, at(14));
      fireEvent.click(screen.getAllByRole("gridcell")[14]);

      expect(onCreateSpan).not.toHaveBeenCalled();
      expect(onOpenDay).toHaveBeenCalledTimes(1);
      restore();
    });
  });
});
