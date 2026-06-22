import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Client, Contact, Entry, ISODateTime, Person, Project } from "@/data/types";
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

  it("modifica il progetto selezionato e lo persiste nello store", async () => {
    render(<ProjectsView />);

    const nameInput = screen.getByLabelText("Nome") as HTMLInputElement;
    expect(nameInput.value).toBe("Sito"); // primo progetto auto-selezionato
    fireEvent.change(nameInput, { target: { value: "Sito web" } });

    const statusSelect = screen.getByLabelText("Stato") as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: "paused" } });

    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => {
      const p = useInventoryStore
        .getState()
        .projects.find((x) => x.id === "p1");
      expect(p?.name).toBe("Sito web");
      expect(p?.status).toBe("paused");
    });
  });

  it("elimina il progetto selezionato dallo store", async () => {
    render(<ProjectsView />);

    fireEvent.click(screen.getByRole("button", { name: /elimina/i }));

    await waitFor(() => {
      expect(
        useInventoryStore.getState().projects.map((p) => p.id),
      ).not.toContain("p1");
    });
  });

  it("crea un nuovo progetto e lo seleziona per la modifica", async () => {
    render(<ProjectsView />);

    fireEvent.click(screen.getByRole("button", { name: /nuovo progetto/i }));

    await waitFor(() => {
      expect(
        useInventoryStore
          .getState()
          .projects.some((p) => p.name === "Nuovo progetto"),
      ).toBe(true);
    });
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe(
      "Nuovo progetto",
    );
  });

  it("mostra il team (colleghi) e i referenti del progetto", () => {
    useInventoryStore.setState({
      clients: [{ id: "c1", name: "Acme" } as Client],
      projects: [
        { ...project("p1", "c1", "Sito"), teamIds: ["u1"], contactIds: ["k1"] },
      ],
      people: [{ id: "u1", name: "Mario Rossi" } as Person],
      contacts: [{ id: "k1", clientId: "c1", name: "Lucia Bianchi" } as Contact],
    });
    render(<ProjectsView />);
    expect(screen.getByText("Mario Rossi")).toBeInTheDocument();
    expect(screen.getByText("Lucia Bianchi")).toBeInTheDocument();
  });

  it("aggiunge una sotto-attività e la salva nel progetto", async () => {
    render(<ProjectsView />);

    fireEvent.click(
      screen.getByRole("button", { name: /aggiungi sotto-attività/i }),
    );
    fireEvent.change(screen.getByLabelText("Sotto-attività"), {
      target: { value: "Analisi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => {
      const p = useInventoryStore.getState().projects.find((x) => x.id === "p1");
      expect(p?.subtaskDefs).toEqual([
        expect.objectContaining({ label: "Analisi" }),
      ]);
    });
  });

  it("assegna un cliente a un progetto interno", async () => {
    render(<ProjectsView />);

    fireEvent.click(screen.getByText("Manutenzione")); // interno (clientId null)
    const clientSelect = screen.getByLabelText("Cliente") as HTMLSelectElement;
    fireEvent.change(clientSelect, { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() => {
      const p = useInventoryStore.getState().projects.find((x) => x.id === "p2");
      expect(p?.clientId).toBe("c1");
      expect(p?.kind).toBe("client");
    });
  });
});
