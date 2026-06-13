import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Client, Entry, Project } from "@/data/types";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { EntryEditor } from "@/features/calendar/EntryEditor";

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

function client(id: string, name: string): Client {
  return { id, name, color: null, createdAt: 0 };
}
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
function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    startsAt: "2026-06-12T09:00:00",
    endsAt: "2026-06-12T10:00:00",
    type: "client",
    projectId: null,
    clientId: null,
    subtypeId: null,
    title: "Vecchio",
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

beforeEach(async () => {
  await db.entries.clear();
  useCalendarStore.setState({ entries: [] });
  useEditorStore.setState({ open: false, base: null, detail: null });
  useInventoryStore.setState({
    clients: [client("c1", "Acme")],
    projects: [project("p1", "c1", "Sito"), project("p2", null, "Interno")],
  });
});

describe("EntryEditor", () => {
  it("Salva è disabilitato senza titolo", () => {
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 });
    render(<EntryEditor />);
    expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled();
  });

  it("crea una nuova entry e la persiste", async () => {
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 });
    render(<EntryEditor />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Riunione" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    const saved = useCalendarStore.getState().entries[0];
    expect(saved.title).toBe("Riunione");
    expect(saved.startsAt).toBe("2026-06-12T09:00:00");
    expect(saved.endsAt).toBe("2026-06-12T10:00:00");
    expect(await db.entries.get(saved.id)).toMatchObject({ title: "Riunione" });
    expect(useEditorStore.getState().open).toBe(false);
  });

  it("la cascata: scegliendo un progetto deriva il cliente", async () => {
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 });
    render(<EntryEditor />);

    // Senza cliente, il progetto mostra solo quelli interni.
    const projectBox = screen.getByRole("combobox", { name: "Progetto" });
    fireEvent.focus(projectBox);
    expect(screen.getByRole("option", { name: "Interno" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Sito" }),
    ).not.toBeInTheDocument();

    // Scegliendo il cliente Acme, compare il suo progetto Sito.
    const clientBox = screen.getByRole("combobox", { name: "Cliente" });
    fireEvent.focus(clientBox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Acme" }));

    fireEvent.focus(projectBox);
    expect(screen.getByRole("option", { name: "Sito" })).toBeInTheDocument();
  });

  it("modifica: precompila il titolo e salva sulla stessa entry", async () => {
    const e = entry();
    await db.entries.put(e);
    useCalendarStore.setState({ entries: [e] });
    useEditorStore.getState().openEdit(e);
    render(<EntryEditor />);

    const title = screen.getByLabelText("Titolo") as HTMLInputElement;
    expect(title.value).toBe("Vecchio");
    fireEvent.change(title, { target: { value: "Nuovo" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries[0].title).toBe("Nuovo"),
    );
    expect(useCalendarStore.getState().entries).toHaveLength(1);
    expect(useCalendarStore.getState().entries[0].id).toBe("e1");
  });

  it("elimina: rimuove la entry in modifica", async () => {
    const e = entry();
    await db.entries.put(e);
    useCalendarStore.setState({ entries: [e] });
    useEditorStore.getState().openEdit(e);
    render(<EntryEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Elimina" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(0),
    );
    expect(await db.entries.get("e1")).toBeUndefined();
  });
});
