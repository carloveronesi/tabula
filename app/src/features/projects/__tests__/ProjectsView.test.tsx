import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Client, Entry, ISODateTime, Project } from "@/data/types";
import { useInventoryStore } from "@/store/inventory";
import { ProjectsView } from "@/features/projects/ProjectsView";

function project(id: string, clientId: string | null, name: string): Project {
  return {
    id,
    clientId,
    kind: clientId ? "client" : "internal",
    name,
    subtaskDefs: [],
    status: "active",
    description: "",
    objectives: "",
    startDate: "",
    endDate: "",
    teamIds: [],
    contactIds: [],
    estimatedHours: 0,
  };
}
function entry(id: string, projectId: string, startsAt: ISODateTime, endsAt: ISODateTime): Entry {
  return {
    id,
    startsAt,
    endsAt,
    type: "client",
    projectId,
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

beforeEach(async () => {
  await db.entries.clear();
  useInventoryStore.setState({
    clients: [{ id: "c1", name: "Acme" } as Client],
    projects: [project("p1", "c1", "Sito"), project("p2", null, "Manutenzione")],
  });
});

describe("ProjectsView", () => {
  it("stato vuoto senza progetti", () => {
    useInventoryStore.setState({ clients: [], projects: [] });
    render(<ProjectsView />);
    expect(screen.getByText(/nessun progetto/i)).toBeInTheDocument();
  });

  it("raggruppa per cliente e mostra le statistiche del progetto scelto", async () => {
    await db.entries.bulkPut([
      entry("a", "p1", "2026-03-10T09:00:00", "2026-03-10T11:00:00"), // 2h
      entry("b", "p1", "2026-06-02T11:00:00", "2026-06-02T12:00:00"), // 1h
    ]);

    render(<ProjectsView />);

    // gruppi: cliente + interni (intestazioni di gruppo)
    expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Interni" })).toBeInTheDocument();

    // "Sito" è auto-selezionato (primo progetto): le sue stats compaiono
    await waitFor(() =>
      expect(screen.getAllByText("3h").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("2")).toBeInTheDocument(); // conteggio attività
    expect(screen.getByRole("heading", { name: "Sito" })).toBeInTheDocument();

    // selezionando il progetto interno cambia il dettaglio
    fireEvent.click(screen.getByText("Manutenzione"));
    expect(
      screen.getByRole("heading", { name: "Manutenzione" }),
    ).toBeInTheDocument();
  });
});
