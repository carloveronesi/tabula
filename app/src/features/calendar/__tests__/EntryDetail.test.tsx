import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Client, Entry, Project } from "@/data/types";
import { db } from "@/data/db";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { EntryDetail } from "@/features/calendar/EntryDetail";

beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
});

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    startsAt: "2026-06-12T09:00:00",
    endsAt: "2026-06-12T10:30:00",
    type: "client",
    projectId: "p1",
    clientId: "c1",
    subtypeId: null,
    title: "Riunione Alfa",
    collaboratorIds: [],
    contactIds: [],
    notes: "Discussa la roadmap",
    blockers: "",
    nextSteps: "",
    links: [],
    milestone: null,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

beforeEach(async () => {
  await db.entries.clear();
  useEditorStore.setState({ open: false, base: null, detail: null });
  useInventoryStore.setState({
    clients: [{ id: "c1", name: "Acme" } as Client],
    projects: [{ id: "p1", clientId: "c1", name: "Sito" } as Project],
    people: [],
    contacts: [],
  });
  useCalendarStore.setState({ entries: [] });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("EntryDetail", () => {
  it("non mostra nulla senza entry selezionata", () => {
    render(<EntryDetail />);
    expect(screen.queryByText("Riunione Alfa")).not.toBeInTheDocument();
  });

  it("mostra titolo, orario, cliente/progetto e note", () => {
    useEditorStore.getState().showDetail(entry());
    render(<EntryDetail />);

    expect(screen.getByText("Riunione Alfa")).toBeInTheDocument();
    expect(screen.getByText(/09:00–10:30/)).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Sito")).toBeInTheDocument();
    expect(screen.getByText("Discussa la roadmap")).toBeInTheDocument();
  });

  it("mostra il sottotipo risolto e la milestone", () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        subtypes: { client: [{ id: "s1", label: "Riunione" }], internal: [] },
      },
    });
    useEditorStore
      .getState()
      .showDetail(entry({ subtypeId: "s1", milestone: "Fase 2" }));
    render(<EntryDetail />);

    expect(screen.getByText("Riunione")).toBeInTheDocument();
    expect(screen.getByText(/Fase 2/)).toBeInTheDocument();
  });

  it("mostra collaboratori e referenti risolti a nome", () => {
    useInventoryStore.setState({
      people: [{ id: "u1", name: "Mario" }],
      contacts: [{ id: "k1", clientId: "c1", name: "Anna", role: "PM" }],
    });
    useEditorStore
      .getState()
      .showDetail(entry({ collaboratorIds: ["u1"], contactIds: ["k1"] }));
    render(<EntryDetail />);

    expect(screen.getByText("Collaboratori")).toBeInTheDocument();
    expect(screen.getByText("Mario")).toBeInTheDocument();
    expect(screen.getByText("Referenti")).toBeInTheDocument();
    expect(screen.getByText("Anna")).toBeInTheDocument();
  });

  it("omette le sezioni vuote", () => {
    useEditorStore.getState().showDetail(entry({ notes: "" }));
    render(<EntryDetail />);
    expect(screen.queryByText("Note")).not.toBeInTheDocument();
    expect(screen.queryByText("Problemi")).not.toBeInTheDocument();
  });

  it("Modifica apre l'editor sulla stessa entry", () => {
    const e = entry();
    useEditorStore.getState().showDetail(e);
    render(<EntryDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Modifica" }));
    const s = useEditorStore.getState();
    expect(s.open).toBe(true);
    expect(s.base).toBe(e);
    expect(s.detail).toBeNull();
  });

  it("Duplica crea una copia nel primo slot libero della giornata", async () => {
    const e = entry(); // 09:00–10:30
    useCalendarStore.setState({ entries: [e] });
    useEditorStore.getState().showDetail(e);
    render(<EntryDetail />);

    fireEvent.click(screen.getByRole("button", { name: "Duplica" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(2),
    );
    const dup = useCalendarStore.getState().entries.find((x) => x.id !== "e1");
    expect(dup?.title).toBe("Riunione Alfa");
    expect(dup?.startsAt.slice(0, 10)).toBe("2026-06-12");
    // non si sovrappone all'originale (09:00–10:30) → parte da 10:30
    expect(dup?.startsAt).toBe("2026-06-12T10:30:00");
    expect(await db.entries.get(dup!.id)).toBeTruthy();
  });
});
