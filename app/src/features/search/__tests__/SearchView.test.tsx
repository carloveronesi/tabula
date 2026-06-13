import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import type { Entry, ISODateTime } from "@/data/types";
import { useEditorStore } from "@/store/editor";
import { useInventoryStore } from "@/store/inventory";
import { SearchView } from "@/features/search/SearchView";

function entry(id: string, startsAt: ISODateTime, over: Partial<Entry> = {}): Entry {
  return {
    id,
    startsAt,
    endsAt: startsAt,
    type: "client",
    projectId: null,
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
    ...over,
  };
}

beforeEach(async () => {
  await db.entries.clear();
  useInventoryStore.setState({ clients: [], projects: [] });
  useEditorStore.setState({ open: false, base: null, detail: null });
  await db.entries.bulkPut([
    entry("1", "2026-03-01T09:00:00", { title: "Kickoff Alfa" }),
    entry("2", "2026-06-01T09:00:00", { title: "Standup Beta" }),
  ]);
});

describe("SearchView", () => {
  it("suggerisce di cercare quando non c'è query", () => {
    render(<SearchView />);
    expect(screen.getByText(/scrivi qualcosa o scegli un tipo/i)).toBeInTheDocument();
  });

  it("mostra i risultati che combaciano col testo", async () => {
    render(<SearchView />);
    fireEvent.change(screen.getByLabelText("Cerca"), {
      target: { value: "alfa" },
    });
    await waitFor(() =>
      expect(screen.getByText("Kickoff Alfa")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Standup Beta")).not.toBeInTheDocument();
  });

  it("un risultato apre il dettaglio", async () => {
    render(<SearchView />);
    fireEvent.change(screen.getByLabelText("Cerca"), {
      target: { value: "beta" },
    });
    const result = await screen.findByText("Standup Beta");
    fireEvent.click(result);
    expect(useEditorStore.getState().detail?.id).toBe("2");
  });

  it("nessun risultato → messaggio dedicato", async () => {
    render(<SearchView />);
    fireEvent.change(screen.getByLabelText("Cerca"), {
      target: { value: "zzz" },
    });
    await waitFor(() =>
      expect(screen.getByText("Nessun risultato.")).toBeInTheDocument(),
    );
  });
});
