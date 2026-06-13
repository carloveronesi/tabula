import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import { useInventoryStore } from "@/store/inventory";
import { useToastStore } from "@/store/toast";
import type { Entry } from "@/data/types";
import { SettingsView } from "@/features/settings/SettingsView";

const downloads: { filename: string; text: string }[] = [];
vi.mock("@/data/export/triggerDownload", () => ({
  triggerDownload: (filename: string, text: string) =>
    downloads.push({ filename, text }),
}));

const entry = (id: string): Entry => ({
  id,
  startsAt: "2026-06-12T09:00:00",
  endsAt: "2026-06-12T10:00:00",
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
});

function stringifyValues(obj: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]),
  );
}

const exportText = JSON.stringify(
  stringifyValues({
    "dailylog:v1:__clients": { acme: { name: "ACME" } },
    "dailylog:v1:__projects": {
      prj_a: { id: "prj_a", name: "P", kind: "client", clientKey: "acme", status: "active" },
    },
  }),
);

function fileWithText(text: string, name = "export.json"): File {
  const file = new File([text], name, { type: "application/json" });
  // jsdom non implementa Blob.text in modo affidabile: lo forniamo noi.
  Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
  return file;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  useInventoryStore.setState({ clients: [], projects: [] });
  useToastStore.setState({ toasts: [] });
  downloads.length = 0;
});

describe("SettingsView", () => {
  it("importa il file scelto e mostra il riepilogo", async () => {
    render(<SettingsView />);

    fireEvent.change(screen.getByLabelText("File di export"), {
      target: { files: [fileWithText(exportText)] },
    });

    await waitFor(() =>
      expect(screen.getByText("Import completato")).toBeInTheDocument(),
    );
    expect(await db.clients.count()).toBe(1);
    // gli store sono ricaricati dopo l'import
    expect(useInventoryStore.getState().clients).toHaveLength(1);
  });

  it("mostra un errore su file non valido", async () => {
    render(<SettingsView />);

    fireEvent.change(screen.getByLabelText("File di export"), {
      target: { files: [fileWithText("{ rotto")] },
    });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/JSON/i),
    );
  });

  it("esporta un backup JSON con i dati dell'archivio e notifica", async () => {
    await db.entries.bulkPut([entry("a"), entry("b")]);
    render(<SettingsView />);

    fireEvent.click(screen.getByRole("button", { name: /Esporta backup/ }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].filename).toMatch(/^tabula-export-\d{4}-\d{2}-\d{2}\.json$/);

    const doc = JSON.parse(downloads[0].text);
    expect(doc.format).toBe("tabula");
    expect(doc.entries.map((e: Entry) => e.id).sort()).toEqual(["a", "b"]);

    await waitFor(() =>
      expect(useToastStore.getState().toasts).toHaveLength(1),
    );
    expect(useToastStore.getState().toasts[0].message).toMatch(/2 attività/);
  });
});
