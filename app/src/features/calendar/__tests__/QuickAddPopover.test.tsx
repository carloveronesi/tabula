import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Client, Project } from "@/data/types";
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

function project(
  id: string,
  name: string,
  clientId: string | null,
  status: Project["status"] = "active",
): Project {
  return {
    id,
    clientId,
    kind: clientId ? "client" : "internal",
    name,
    status,
    description: "",
    objectives: "",
    startDate: "",
    endDate: "",
    teamIds: [],
    contactIds: [],
    estimatedHours: 0,
    color: null,
  };
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

  it("in modalità Interno salva un'attività interna col progetto scelto", async () => {
    useInventoryStore.setState({ projects: [project("p1", "Team AI", null)] });
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Allineamento" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Interno" }));
    const box = screen.getByRole("combobox", { name: "Progetto interno" });
    fireEvent.focus(box);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Team AI" }));
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    const saved = useCalendarStore.getState().entries[0];
    expect(saved.type).toBe("internal");
    expect(saved.projectId).toBe("p1");
    expect(saved.clientId).toBeNull();
  });

  it("in modalità Cliente senza cliente scelto il progetto non mostra gli interni", () => {
    useInventoryStore.setState({
      clients: [client("c1", "Acme")],
      projects: [project("p2", "Interno", null)],
    });
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.focus(screen.getByRole("combobox", { name: "Progetto" }));
    expect(screen.queryByRole("option", { name: "Interno" })).toBeNull();
  });

  it("in modalità Cliente il selettore progetto elenca i progetti del cliente", async () => {
    useInventoryStore.setState({
      clients: [client("c1", "Acme")],
      projects: [project("p1", "Sito Acme", "c1")],
    });
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: "Call" } });
    const clientBox = screen.getByRole("combobox", { name: "Cliente" });
    fireEvent.focus(clientBox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Acme" }));
    const projectBox = screen.getByRole("combobox", { name: "Progetto" });
    fireEvent.focus(projectBox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Sito Acme" }));
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    const saved = useCalendarStore.getState().entries[0];
    expect(saved.type).toBe("client");
    expect(saved.clientId).toBe("c1");
    expect(saved.projectId).toBe("p1");
  });

  it("il selettore interno nasconde i progetti archiviati", () => {
    useInventoryStore.setState({
      projects: [
        project("p1", "Team AI", null),
        project("p2", "Vecchio interno", null, "archived"),
      ],
    });
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.click(screen.getByRole("button", { name: "Interno" }));
    fireEvent.focus(screen.getByRole("combobox", { name: "Progetto interno" }));
    expect(screen.getByRole("option", { name: "Team AI" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Vecchio interno" })).toBeNull();
  });

  it("passare a Interno azzera il cliente scelto in modalità Cliente", async () => {
    useInventoryStore.setState({
      clients: [client("c1", "Acme")],
      projects: [project("p1", "Team AI", null)],
    });
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: "X" } });
    const clientBox = screen.getByRole("combobox", { name: "Cliente" });
    fireEvent.focus(clientBox);
    fireEvent.mouseDown(screen.getByRole("option", { name: "Acme" }));
    fireEvent.click(screen.getByRole("button", { name: "Interno" }));
    // In modalità Interno non c'è più il selettore cliente.
    expect(screen.queryByRole("combobox", { name: "Cliente" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Salva" }));

    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    const saved = useCalendarStore.getState().entries[0];
    expect(saved.type).toBe("internal");
    expect(saved.clientId).toBeNull();
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

  // Niente bottone "Annulla": il popover si congeda da sé. Le tre vie d'uscita
  // sono Esc (sotto), il click fuori e lo scroll — se una si rompe, si resta
  // intrappolati in un popover senza chiusura visibile.
  it("un click fuori chiude senza creare nulla", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), {
      target: { value: "Da scartare" },
    });
    expect(screen.queryByRole("button", { name: "Annulla" })).toBeNull();

    fireEvent.mouseDown(document.body);

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

  it("uno scroll che sposta la pagina chiude il popover (l'ancora diventa stale)", () => {
    openSlot();
    render(<QuickAddPopover />);

    window.scrollY = 120;
    fireEvent.scroll(window);
    window.scrollY = 0;
    expect(useEditorStore.getState().quickAdd).toBeNull();
  });

  it("uno scroll spurio che non sposta la pagina non chiude il popover", () => {
    openSlot();
    render(<QuickAddPopover />);

    // scroll interno (es. lista del cliente, focus-into-view) senza muovere la finestra
    fireEvent.scroll(window);
    expect(useEditorStore.getState().quickAdd).not.toBeNull();
  });

  it("un resize della finestra chiude il popover", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent(window, new Event("resize"));
    expect(useEditorStore.getState().quickAdd).toBeNull();
  });
});

describe("QuickAddPopover — interpretazione AI", () => {
  const FRASE = "call con Acme sul sito, ieri 2h dalle 15";

  /** Il provider risponde con il JSON che il client si aspetta. */
  function mockChat(payload: unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: JSON.stringify(payload) } }],
            }),
            { status: 200 },
          ),
        ),
      ),
    );
  }

  function enableAi() {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        ai: { enabled: true, baseUrl: "https://x/v1", apiKey: "k", model: "m" },
      },
    });
  }

  beforeEach(() => {
    useInventoryStore.setState({
      clients: [client("c1", "Acme")],
      projects: [project("p1", "Sito Acme", "c1")],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("senza AI attiva il bottone non compare", () => {
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: FRASE } });
    expect(screen.queryByRole("button", { name: /Interpreta/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Più dettagli/ })).toBeInTheDocument();
  });

  // I due bottoni si contendevano lo stesso slot: con l'AI accesa "Interpreta"
  // compare a partire dal primo carattere, e l'editor completo restava senza
  // nessuna via d'accesso.
  it("con AI attiva 'Interpreta' non scaccia 'Più dettagli'", () => {
    enableAi();
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: "a" } });
    expect(screen.getByRole("button", { name: /Interpreta/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Più dettagli/ })).toBeInTheDocument();
  });

  it("con AI attiva compila i campi e salva data e orario proposti", async () => {
    enableAi();
    mockChat({
      title: "Call sul rifacimento sito",
      dayOffset: -1,
      start: "15:00",
      durationMin: 120,
      projectId: "p1",
    });
    openSlot();
    render(<QuickAddPopover />);

    const titolo = screen.getByLabelText("Titolo");
    fireEvent.change(titolo, { target: { value: FRASE } });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));

    await waitFor(() =>
      expect(titolo).toHaveValue("Call sul rifacimento sito"),
    );
    // il cliente arriva dal progetto, non dalla parola nella frase
    expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("Acme");
    expect(screen.getByRole("combobox", { name: "Progetto" })).toHaveValue("Sito Acme");

    fireEvent.click(screen.getByRole("button", { name: "Salva" }));
    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    const saved = useCalendarStore.getState().entries[0];
    // slot cliccato: 12/06 09:00–10:00; proposta: il giorno prima, 15:00–17:00
    expect(saved.startsAt).toBe("2026-06-11T15:00:00");
    expect(saved.endsAt).toBe("2026-06-11T17:00:00");
    expect(saved.clientId).toBe("c1");
    expect(saved.projectId).toBe("p1");
  });

  it("un id inventato lascia il campo vuoto invece di riempirlo a caso", async () => {
    enableAi();
    mockChat({ title: "Call", clientId: "c-inventato", projectId: "p-inventato" });
    openSlot();
    render(<QuickAddPopover />);

    const titolo = screen.getByLabelText("Titolo");
    fireEvent.change(titolo, { target: { value: FRASE } });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));

    await waitFor(() => expect(titolo).toHaveValue("Call"));
    expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Progetto" })).toHaveValue("");
  });

  it("Ripristina il testo rimette la frase e annulla la proposta", async () => {
    enableAi();
    mockChat({
      title: "Call sul rifacimento sito",
      dayOffset: -1,
      start: "15:00",
      durationMin: 120,
      projectId: "p1",
    });
    openSlot();
    render(<QuickAddPopover />);

    const titolo = screen.getByLabelText("Titolo");
    fireEvent.change(titolo, { target: { value: FRASE } });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));
    await waitFor(() => expect(titolo).toHaveValue("Call sul rifacimento sito"));

    fireEvent.click(screen.getByRole("button", { name: "Ripristina il testo" }));
    expect(titolo).toHaveValue(FRASE);
    expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Salva" }));
    await waitFor(() =>
      expect(useCalendarStore.getState().entries).toHaveLength(1),
    );
    // torna lo slot cliccato
    expect(useCalendarStore.getState().entries[0].startsAt).toBe(
      "2026-06-12T09:00:00",
    );
  });

  it("porta in 'Più dettagli' le persone nominate nella frase", async () => {
    enableAi();
    useInventoryStore.setState({
      clients: [client("c1", "Acme")],
      projects: [{ ...project("p1", "Sito Acme", "c1"), teamIds: ["u1", "u2"] }],
      people: [
        { id: "u1", name: "Mario Rossi" },
        { id: "u2", name: "Anna Bianchi" },
        { id: "u3", name: "Luca Neri" }, // fuori dal team: non deve entrare
      ],
      contacts: [
        { id: "k1", clientId: "c1", name: "Giulia Conti", role: "PM" },
        { id: "k2", clientId: "c9", name: "Paolo Grigi", role: "PM" },
      ],
    });
    mockChat({ title: "Call", projectId: "p1" });
    openSlot();
    render(<QuickAddPopover />);

    const titolo = screen.getByLabelText("Titolo");
    fireEvent.change(titolo, {
      target: { value: "call con Mario e Giulia, e anche Luca" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));
    await waitFor(() => expect(titolo).toHaveValue("Call"));

    fireEvent.click(screen.getByRole("button", { name: /Più dettagli/ }));
    const seed = useEditorStore.getState().seed;
    expect(seed.collaboratorIds).toEqual(["u1"]);
    expect(seed.contactIds).toEqual(["k1"]);
  });

  it("un progetto archiviato non è proponibile", async () => {
    enableAi();
    useInventoryStore.setState({
      clients: [client("c1", "Acme")],
      projects: [project("p1", "Sito Acme", "c1", "archived")],
    });
    // anche se il modello lo nominasse, non è fra i candidati
    mockChat({ title: "Call", projectId: "p1" });
    openSlot();
    render(<QuickAddPopover />);

    const titolo = screen.getByLabelText("Titolo");
    fireEvent.change(titolo, { target: { value: FRASE } });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));

    await waitFor(() => expect(titolo).toHaveValue("Call"));
    expect(screen.getByRole("combobox", { name: "Progetto" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("");
  });

  it("cambiare cliente a mano scarta le persone della proposta", async () => {
    enableAi();
    useInventoryStore.setState({
      clients: [client("c1", "Acme"), client("c2", "Globex")],
      projects: [{ ...project("p1", "Sito Acme", "c1"), teamIds: ["u1"] }],
      people: [{ id: "u1", name: "Mario Rossi" }],
      contacts: [{ id: "k1", clientId: "c1", name: "Giulia Conti", role: "PM" }],
    });
    mockChat({ title: "Call", projectId: "p1" });
    openSlot();
    render(<QuickAddPopover />);

    const titolo = screen.getByLabelText("Titolo");
    fireEvent.change(titolo, { target: { value: "call con Mario e Giulia" } });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));
    await waitFor(() => expect(titolo).toHaveValue("Call"));

    // il cliente cambia: i referenti di Acme non c'entrano più
    const clientBox = screen.getByRole("combobox", { name: "Cliente" });
    fireEvent.focus(clientBox);
    // il campo contiene "Acme" e filtra la lista: si svuota per rivedere tutti
    fireEvent.change(clientBox, { target: { value: "" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: "Globex" }));
    fireEvent.click(screen.getByRole("button", { name: /Più dettagli/ }));

    const seed = useEditorStore.getState().seed;
    expect(seed.collaboratorIds).toEqual([]);
    expect(seed.contactIds).toEqual([]);
  });

  it("senza configurazione dice di sistemare le Impostazioni", async () => {
    useSettingsStore.setState({
      settings: {
        ...DEFAULT_SETTINGS,
        ai: { enabled: true, baseUrl: "", apiKey: "", model: "" },
      },
    });
    openSlot();
    render(<QuickAddPopover />);

    fireEvent.change(screen.getByLabelText("Titolo"), { target: { value: FRASE } });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Impostazioni/);
  });

  it("un errore del provider lascia il popover intatto", async () => {
    enableAi();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("", { status: 401 }))));
    openSlot();
    render(<QuickAddPopover />);

    const titolo = screen.getByLabelText("Titolo");
    fireEvent.change(titolo, { target: { value: FRASE } });
    fireEvent.click(screen.getByRole("button", { name: /Interpreta/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/key/i);
    expect(titolo).toHaveValue(FRASE);
  });

});

describe("QuickAddPopover — selezione multi-giorno", () => {
    const DAYS = ["2026-06-15", "2026-06-16", "2026-06-17"];

    const openSpan = () =>
      useEditorStore.getState().openQuickAdd({ ...SLOT, days: DAYS });

    const type = (title: string) =>
      fireEvent.change(screen.getByLabelText("Titolo"), {
        target: { value: title },
      });

    it("mostra i giorni e le fasce mattina + pomeriggio", () => {
      openSpan();
      render(<QuickAddPopover />);
      expect(screen.getByText("3 giorni")).toBeInTheDocument();
      expect(screen.getByText("09:00–13:00 · 14:00–18:00")).toBeInTheDocument();
      // l'editor completo lavora su una entry sola: qui non ha senso
      expect(screen.queryByText("Più dettagli")).toBeNull();
    });

    it("salva due blocchi per giorno, pranzo libero", async () => {
      openSpan();
      render(<QuickAddPopover />);
      type("Sviluppo");
      fireEvent.click(screen.getByRole("button", { name: "Salva" }));

      await waitFor(() =>
        expect(useCalendarStore.getState().entries).toHaveLength(6),
      );
      const saved = [...useCalendarStore.getState().entries].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      );
      expect(saved.map((e) => [e.startsAt, e.endsAt])).toEqual([
        ["2026-06-15T09:00:00", "2026-06-15T13:00:00"],
        ["2026-06-15T14:00:00", "2026-06-15T18:00:00"],
        ["2026-06-16T09:00:00", "2026-06-16T13:00:00"],
        ["2026-06-16T14:00:00", "2026-06-16T18:00:00"],
        ["2026-06-17T09:00:00", "2026-06-17T13:00:00"],
        ["2026-06-17T14:00:00", "2026-06-17T18:00:00"],
      ]);
      expect(saved.every((e) => e.title === "Sviluppo")).toBe(true);
    });

    it("con Ferie: un blocco per giorno, senza cliente né progetto", async () => {
      openSpan();
      render(<QuickAddPopover />);
      fireEvent.click(screen.getByRole("button", { name: "Ferie" }));
      expect(screen.queryByLabelText("Cliente")).toBeNull();
      expect(screen.getByText("09:00–18:00")).toBeInTheDocument();

      type("Ferie");
      fireEvent.click(screen.getByRole("button", { name: "Salva" }));

      await waitFor(() =>
        expect(useCalendarStore.getState().entries).toHaveLength(3),
      );
      const saved = useCalendarStore.getState().entries;
      expect(saved.every((e) => e.type === "vacation")).toBe(true);
      expect(saved.every((e) => e.clientId === null)).toBe(true);
      expect(saved.map((e) => e.startsAt).sort()).toEqual(
        DAYS.map((d) => `${d}T09:00:00`),
      );
    });

    it("Annulla disfa tutte le attività create, non solo l'ultima", async () => {
      openSpan();
      render(<QuickAddPopover />);
      type("Sviluppo");
      fireEvent.click(screen.getByRole("button", { name: "Salva" }));
      await waitFor(() =>
        expect(useCalendarStore.getState().entries).toHaveLength(6),
      );

      const toast = useToastStore.getState().toasts.at(-1)!;
      expect(toast.message).toBe("6 attività create su 3 giorni");
      toast.action!.run();

      await waitFor(() =>
        expect(useCalendarStore.getState().entries).toHaveLength(0),
      );
    });
  });
