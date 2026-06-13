import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "@/ui/Modal";

// jsdom non implementa showModal/close: stub minimi che riflettono `open`.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
});

describe("Modal", () => {
  it("non mostra il contenuto quando chiuso", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Nuova attività">
        <p>corpo</p>
      </Modal>,
    );
    expect(screen.queryByText("corpo")).not.toBeInTheDocument();
  });

  it("mostra titolo e contenuto quando aperto", () => {
    render(
      <Modal open onClose={() => {}} title="Nuova attività">
        <p>corpo</p>
      </Modal>,
    );
    expect(screen.getByText("Nuova attività")).toBeInTheDocument();
    expect(screen.getByText("corpo")).toBeInTheDocument();
  });

  it("il bottone Chiudi chiama onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titolo">
        <p>corpo</p>
      </Modal>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
