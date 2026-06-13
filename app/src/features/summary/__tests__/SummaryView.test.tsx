import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Client, Entry, EntryType, ISODateTime } from "@/data/types";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { SummaryView } from "@/features/summary/SummaryView";

function entry(
  id: string,
  startsAt: ISODateTime,
  endsAt: ISODateTime,
  type: EntryType,
  clientId: string | null,
): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type,
    projectId: null,
    clientId,
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

beforeEach(() => {
  useInventoryStore.setState({
    clients: [
      { id: "c1", name: "Acme" } as Client,
      { id: "c2", name: "Beta" } as Client,
    ],
    projects: [],
  });
  useCalendarStore.setState({ entries: [] });
});

describe("SummaryView", () => {
  it("stato vuoto quando non ci sono attività", () => {
    render(<SummaryView />);
    expect(screen.getByText(/nessuna attività registrata/i)).toBeInTheDocument();
  });

  it("mostra totale, ripartizione per cliente e per tipo", () => {
    useCalendarStore.setState({
      entries: [
        entry("a", "2026-06-01T09:00:00", "2026-06-01T11:00:00", "client", "c1"),
        entry("b", "2026-06-01T11:00:00", "2026-06-01T12:00:00", "client", "c2"),
        entry("c", "2026-06-02T09:00:00", "2026-06-02T09:30:00", "internal", null),
      ],
    });
    render(<SummaryView />);

    expect(screen.getByText("3h 30m")).toBeInTheDocument(); // totale
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("Interno")).toBeInTheDocument();
  });
});
