import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Client, Entry, Project } from "@/data/types";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toast";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { emptyHistory } from "@/domain/history";
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
  useCalendarStore.setState({ entries: [], history: emptyHistory<Entry>() });
  useToastStore.setState({ toasts: [] });
  useEditorStore.setState({ open: false, base: null, detail: null });
  useInventoryStore.setState({
    clients: [client("c1", "Acme")],
    projects: [project("p1", "c1", "Sito"), project("p2", null, "Interno")],
  });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
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

  it("blocca il salvataggio se l'orario si sovrappone a un'altra attività", () => {
    const occupied = entry({
      id: "x",
      startsAt: "2026-06-12T09:00:00",
      endsAt: "2026-06-12T10:00:00",
      title: "Occupato",
    });
    useCalendarStore.setState({ entries: [occupied] });
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 }); // stesso slot
    render(<EntryEditor />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Nuova" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/sovrappone/i);
    expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled();
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

  it("mostra i sottotipi del tipo selezionato e li salva sulla entry", async () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        subtypes: {
          client: [{ id: "s1", label: "Riunione" }],
          internal: [],
        },
      },
    });
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 });
    render(<EntryEditor />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Call" },
    });
    const sub = screen.getByRole("combobox", { name: "Sottotipo" });
    fireEvent.focus(sub);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Riunione" }));
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    expect(useCalendarStore.getState().entries[0].subtypeId).toBe("s1");
  });

  it("salva la milestone digitata", async () => {
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 });
    render(<EntryEditor />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Lavoro" },
    });
    fireEvent.change(screen.getByLabelText("Milestone"), {
      target: { value: "Fase 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    expect(useCalendarStore.getState().entries[0].milestone).toBe("Fase 2");
  });

  it("modifica: precompila e salva 'cosa è andato storto' e 'prossimi passi'", async () => {
    const e = entry({ blockers: "vecchio problema", nextSteps: "vecchio passo" });
    await db.entries.put(e);
    useCalendarStore.setState({ entries: [e] });
    useEditorStore.getState().openEdit(e);
    render(<EntryEditor />);

    const blk = screen.getByLabelText(
      "Cosa è andato storto",
    ) as HTMLTextAreaElement;
    expect(blk.value).toBe("vecchio problema");
    fireEvent.change(blk, { target: { value: "nuovo problema" } });

    const nxt = screen.getByLabelText("Prossimi passi") as HTMLTextAreaElement;
    expect(nxt.value).toBe("vecchio passo");
    fireEvent.change(nxt, { target: { value: "nuovo passo" } });

    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries[0].blockers).toBe(
        "nuovo problema",
      ),
    );
    expect(useCalendarStore.getState().entries[0].nextSteps).toBe("nuovo passo");
  });

  it("aggiunge un link e lo salva con la entry", async () => {
    useEditorStore
      .getState()
      .openCreate({ date: "2026-06-12", startMin: 540, endMin: 600 });
    render(<EntryEditor />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Con link" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi link" }));
    fireEvent.change(screen.getByLabelText("Etichetta link 1"), {
      target: { value: "Doc" },
    });
    fireEvent.change(screen.getByLabelText("URL link 1"), {
      target: { value: "http://x" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    expect(useCalendarStore.getState().entries[0].links).toEqual([
      { label: "Doc", url: "http://x" },
    ]);
  });

  it("rimuove un link esistente in modifica", async () => {
    const e = entry({ links: [{ label: "Doc", url: "http://x" }] });
    await db.entries.put(e);
    useCalendarStore.setState({ entries: [e] });
    useEditorStore.getState().openEdit(e);
    render(<EntryEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rimuovi link 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries[0].links).toEqual([]),
    );
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

  it("eliminando si crea un toast la cui azione Annulla ripristina la entry", async () => {
    const e = entry();
    await db.entries.put(e);
    useCalendarStore.setState({ entries: [e] });
    useEditorStore.getState().openEdit(e);
    render(<EntryEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Elimina" }));

    await waitFor(() =>
      expect(useToastStore.getState().toasts).toHaveLength(1),
    );
    const toast = useToastStore.getState().toasts[0];
    expect(toast.message).toBe("Attività eliminata");

    toast.action!.run(); // "Annulla"
    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    expect(await db.entries.get("e1")).toBeDefined();
  });
});
