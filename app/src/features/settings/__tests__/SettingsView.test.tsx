import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { db } from "@/data/db";
import { useInventoryStore } from "@/store/inventory";
import { SettingsView } from "@/features/settings/SettingsView";

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
});
