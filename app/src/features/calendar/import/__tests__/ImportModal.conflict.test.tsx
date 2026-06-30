import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Entry, ISODate } from "@/data/types";
import { useCalendarStore } from "@/store/calendar";
import { ImportModal, type ProcessResult } from "../ImportModal";

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

beforeEach(() => {
  useCalendarStore.setState({ entries: [] });
});

interface R {
  key: string;
  date: ISODate;
  startMin: number;
  durationMin: number;
}

function existing(startsAt: string, endsAt: string): Entry {
  return {
    id: startsAt,
    startsAt,
    endsAt,
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
  };
}

function renderModal(rows: R[]) {
  render(
    <ImportModal<R>
      title="Importa"
      description="d"
      fileLabel="file"
      noun={{ one: "evento", many: "eventi", none: "Nessun evento" }}
      emptyReview="vuoto"
      process={async (): Promise<ProcessResult<R>> => ({
        kind: "rows",
        rawText: "x",
        rows,
      })}
      interval={(r) => ({
        date: r.date,
        startMin: r.startMin,
        endMin: r.startMin + r.durationMin,
      })}
      renderRow={(r) => <span>riga {r.key}</span>}
      persist={async () => {}}
      onClose={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("file"), {
    target: { files: [new File(["x"], "s.png", { type: "image/png" })] },
  });
}

describe("ImportModal — sovrapposizioni", () => {
  it("segnala una riga che si sovrappone a un'attività già nel giorno", async () => {
    useCalendarStore.setState({
      entries: [existing("2026-06-12T09:00:00", "2026-06-12T10:00:00")],
    });
    // riga 9:30–10:30 → si accavalla con l'esistente 9:00–10:00
    renderModal([{ key: "r1", date: "2026-06-12", startMin: 570, durationMin: 60 }]);
    await waitFor(() =>
      expect(
        screen.getByText(/Si sovrappone a un'attività esistente/),
      ).toBeInTheDocument(),
    );
  });

  it("nessun badge se non c'è sovrapposizione", async () => {
    useCalendarStore.setState({
      entries: [existing("2026-06-12T09:00:00", "2026-06-12T10:00:00")],
    });
    // riga 10:00–11:00 → adiacente, estremi aperti: nessun conflitto
    renderModal([{ key: "r1", date: "2026-06-12", startMin: 600, durationMin: 60 }]);
    await waitFor(() => expect(screen.getByText("riga r1")).toBeInTheDocument());
    expect(screen.queryByText(/Si sovrappone/)).toBeNull();
  });
});
