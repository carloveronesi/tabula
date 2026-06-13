import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Client, Entry, Project } from "@/data/types";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
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

beforeEach(() => {
  useEditorStore.setState({ open: false, base: null, detail: null });
  useInventoryStore.setState({
    clients: [{ id: "c1", name: "Acme" } as Client],
    projects: [{ id: "p1", clientId: "c1", name: "Sito" } as Project],
  });
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
});
