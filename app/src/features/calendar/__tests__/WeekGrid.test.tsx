import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeekGrid } from "@/features/calendar/WeekGrid";
import type { WorkHours } from "@/domain/slots";
import type { Entry, ISODateTime } from "@/data/types";

const WH: WorkHours = {
  morningStart: 540,
  morningEnd: 780,
  afternoonStart: 840,
  afternoonEnd: 1080,
};

// mercoledì 10 giu 2026 (settimana: lun 8 … dom 14)
const DATE = new Date(2026, 5, 10);

function entry(id: string, startsAt: ISODateTime, endsAt: ISODateTime): Entry {
  return {
    id,
    startsAt,
    endsAt,
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

  it("posiziona i blocchi-evento nel giorno giusto", () => {
    const entries = [
      entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00"), // mer, in settimana
      entry("b", "2026-06-11T14:00:00", "2026-06-11T15:00:00"), // gio, in settimana
      entry("z", "2026-06-20T09:00:00", "2026-06-20T10:00:00"), // fuori settimana
    ];
    render(
      <WeekGrid
        date={DATE}
        workingDays={[0, 1, 2, 3, 4]}
        workHours={WH}
        slotMinutes={30}
        entries={entries}
      />,
    );
    const blocks = screen.getAllByTestId("entry-block");
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.getAttribute("data-start-row")).sort()).toEqual([
      "0",
      "8",
    ]);
  });

  it("clic su un blocco seleziona la entry", () => {
    const onSelectEntry = vi.fn();
    const entries = [entry("a", "2026-06-10T09:00:00", "2026-06-10T10:00:00")];
    render(
      <WeekGrid
        date={DATE}
        workingDays={[0, 1, 2, 3, 4]}
        workHours={WH}
        slotMinutes={30}
        entries={entries}
        onSelectEntry={onSelectEntry}
      />,
    );
    fireEvent.click(screen.getByTestId("entry-block"));
    expect(onSelectEntry).toHaveBeenCalledWith(entries[0]);
  });
});
