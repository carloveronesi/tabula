import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Client, Entry } from "@/data/types";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { useUiStore } from "@/store";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { usePresenceStore } from "@/store/presence";
import { useSettingsStore } from "@/store/settings";
import { MonthSummary } from "@/features/summary/MonthSummary";

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    startsAt: "2026-06-15T09:00:00",
    endsAt: "2026-06-15T11:00:00",
    type: "client",
    projectId: "p1",
    clientId: "c1",
    subtypeId: null,
    title: "x",
    collaboratorIds: [],
    contactIds: [],
    notes: "",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

beforeEach(() => {
  useUiStore.setState({ activeDate: new Date(2026, 5, 15) });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
  useInventoryStore.setState({
    clients: [{ id: "c1", name: "Acme" } as Client],
    projects: [],
    people: [],
    contacts: [],
  });
  usePresenceStore.setState({ metas: {} });
  useCalendarStore.setState({
    entries: [
      entry({ id: "a", clientId: "c1" }),
      entry({ id: "b", startsAt: "2026-06-16T09:00:00", endsAt: "2026-06-16T10:00:00", clientId: "c1" }),
    ],
  });
});

describe("MonthSummary", () => {
  it("mostra totale, sezione clienti e nome cliente", () => {
    render(<MonthSummary variant="page" />);
    expect(screen.getByText("Ore nel mese")).toBeInTheDocument();
    expect(screen.getByText("Clienti")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("ignora le entry di altri mesi nel totale", () => {
    useCalendarStore.setState({
      entries: [
        entry({ id: "a", clientId: "c1" }),
        entry({ id: "old", startsAt: "2026-05-20T09:00:00", endsAt: "2026-05-20T18:00:00", clientId: "c1" }),
      ],
    });
    render(<MonthSummary variant="page" />);
    // un solo giorno attivo a giugno (15), l'entry di maggio è esclusa
    expect(screen.getByText(/su 1 giorno/)).toBeInTheDocument();
  });

  it("click su una riga presenza fissa il filtro per sede", () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        presenceTracking: { ...DEFAULT_SETTINGS.presenceTracking, enabled: true },
      },
    });
    usePresenceStore.setState({ metas: { "2026-06-15": "office" } });
    const onFix = vi.fn();
    render(
      <MonthSummary variant="sidebar" onHoverFilter={() => {}} onFixFilter={onFix} />,
    );
    fireEvent.click(screen.getByText("Ufficio"));
    expect(onFix).toHaveBeenCalledWith({ kind: "location", location: "office" });
  });

  it("click su una card cliente fissa il filtro corrispondente", () => {
    const onFix = vi.fn();
    render(
      <MonthSummary
        variant="sidebar"
        onHoverFilter={() => {}}
        onFixFilter={onFix}
      />,
    );
    fireEvent.click(screen.getByText("Acme"));
    expect(onFix).toHaveBeenCalledWith({ kind: "client", clientId: "c1" });
  });

  it("senza callback le righe non sono interattive (nessun filtro fissato)", () => {
    const onFix = vi.fn();
    render(<MonthSummary variant="page" />);
    fireEvent.click(screen.getByText("Acme"));
    expect(onFix).not.toHaveBeenCalled();
  });
});
