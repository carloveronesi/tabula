import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Client } from "@/data/types";
import { useEditorStore } from "@/store/editor";
import { useCalendarStore } from "@/store/calendar";
import { useInventoryStore } from "@/store/inventory";
import { useSettingsStore } from "@/store/settings";
import { useToastStore } from "@/store/toast";
import { DEFAULT_SETTINGS } from "@/data/settings";
import { emptyHistory } from "@/domain/history";
import type { Entry } from "@/data/types";
import { QuickAddPopover } from "@/features/calendar/QuickAddPopover";

function client(id: string, name: string): Client {
  return { id, name, color: null, createdAt: 0 };
}

const SLOT = {
  date: "2026-06-12",
  startMin: 540, // 09:00
  endMin: 600, // 10:00
  anchor: { x: 100, y: 100 },
};

function openSlot(over: Partial<typeof SLOT> = {}) {
  useEditorStore.getState().openQuickAdd({ ...SLOT, ...over });
}

beforeEach(async () => {
  await db.entries.clear();
  useCalendarStore.setState({ entries: [], history: emptyHistory<Entry>() });
  useToastStore.setState({ toasts: [] });
  useEditorStore.setState({
    open: false,
    base: null,
    detail: null,
    quickAdd: null,
  });
  useInventoryStore.setState({
    clients: [client("c1", "Acme")],
    projects: [],
    people: [],
    contacts: [],
  });
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS });
});

describe("QuickAddPopover", () => {
  it("non rende nulla quando il quick-add è chiuso", () => {
    const { container } = render(<QuickAddPopover />);
    expect(container).toBeEmptyDOMElement();
  });

  it("Salva è disabilitato senza titolo", () => {
    openSlot();
    render(<QuickAddPopover />);
    expect(screen.getByRole("button", { name: "Salva" })).toBeDisabled();
  });

  it("crea e persiste l'attività con titolo e orario dello slot", async () => {
    openSlot();
    render(<QuickAddPopover />);

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
    // chiude il quick-add e annuncia con un toast con azione Annulla
    expect(useEditorStore.getState().quickAdd).toBeNull();
    expect(useToastStore.getState().toasts[0].message).toBe("Attività creata");
  });

  it("Invio nel titolo salva l'attività", async () => {
    openSlot();
    render(<QuickAddPopover />);

    const title = screen.getByLabelText("Titolo");
    fireEvent.change(title, { target: { value: "Veloce" } });
    fireEvent.keyDown(title, { key: "Enter" });

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    expect(useCalendarStore.getState().entries[0].title).toBe("Veloce");
  });

  it("salva il cliente scelto sull'attività", async () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Call" },
    });
    const clientBox = screen.getByRole("combobox", { name: "Cliente" });
    fireEvent.focus(clientBox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Acme" }));
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    const saved = useCalendarStore.getState().entries[0];
    expect(saved.clientId).toBe("c1");
    expect(saved.type).toBe("client");
  });

  it("crea un cliente al volo dal combobox e lo salva", async () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Call" },
    });
    const clientBox = screen.getByRole("combobox", { name: "Cliente" });
    fireEvent.focus(clientBox);
    fireEvent.change(clientBox, { target: { value: "Globex" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: /Crea .*Globex/ }));

    await waitFor(() =>
      expect(
        useInventoryStore.getState().clients.some((c) => c.name === "Globex"),
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    const newClient = useInventoryStore
      .getState()
      .clients.find((c) => c.name === "Globex");
    expect(useCalendarStore.getState().entries[0].clientId).toBe(newClient!.id);
  });

  it("'Più dettagli' apre l'editor conservando titolo e cliente, e chiude il quick-add", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Bozza" },
    });
    const clientBox = screen.getByRole("combobox", { name: "Cliente" });
    fireEvent.focus(clientBox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Acme" }));

    fireEvent.click(screen.getByRole("button", { name: /Più dettagli/ }));

    const s = useEditorStore.getState();
    expect(s.open).toBe(true);
    expect(s.quickAdd).toBeNull();
    expect(s.base).toBeNull();
    expect(s.seed.title).toBe("Bozza");
    expect(s.seed.clientId).toBe("c1");
    expect(s.seed.date).toBe("2026-06-12");
    // niente entry creata: l'editor completa il salvataggio
    expect(useCalendarStore.getState().entries).toHaveLength(0);
  });

  it("Annulla chiude senza creare nulla", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Da scartare" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Annulla" }));

    expect(useEditorStore.getState().quickAdd).toBeNull();
    expect(useCalendarStore.getState().entries).toHaveLength(0);
  });

  it("Esc chiude il popover", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(useEditorStore.getState().quickAdd).toBeNull();
  });

  it("un click fuori dal popover lo chiude", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.mouseDown(document.body);
    expect(useEditorStore.getState().quickAdd).toBeNull();
  });

  it("uno scroll chiude il popover (l'ancora diventa stale)", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.scroll(window);
    expect(useEditorStore.getState().quickAdd).toBeNull();
  });

  it("un resize della finestra chiude il popover", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent(window, new Event("resize"));
    expect(useEditorStore.getState().quickAdd).toBeNull();
  });
});
