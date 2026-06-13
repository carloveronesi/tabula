import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Combobox, type ComboboxOption } from "@/ui/Combobox";

const OPTS: ComboboxOption[] = [
  { id: "c1", label: "Acme Spa" },
  { id: "c2", label: "Beta Srl" },
  { id: "c3", label: "Gamma Inc" },
];

beforeEach(() => {
  // no-op: ogni test renderizza il proprio combobox
});

describe("Combobox", () => {
  it("apre la lista al focus e mostra tutte le opzioni", () => {
    render(<Combobox options={OPTS} value={null} onChange={() => {}} label="Cliente" />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("filtra per testo digitato", () => {
    render(<Combobox options={OPTS} value={null} onChange={() => {}} label="Cliente" />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "bet" } });
    const opts = screen.getAllByRole("option");
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent("Beta Srl");
  });

  it("seleziona col click e chiama onChange con l'id", () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTS} value={null} onChange={onChange} label="Cliente" />);
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.mouseDown(screen.getByText("Gamma Inc"));
    expect(onChange).toHaveBeenCalledWith("c3");
  });

  it("naviga con le frecce e seleziona con Invio", () => {
    const onChange = vi.fn();
    render(<Combobox options={OPTS} value={null} onChange={onChange} label="Cliente" />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" }); // highlight 0 → 1
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("c2");
  });

  it("mostra il testo vuoto quando nessun risultato", () => {
    render(<Combobox options={OPTS} value={null} onChange={() => {}} label="Cliente" />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("Nessun risultato")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("riflette il valore selezionato nel testo", () => {
    render(<Combobox options={OPTS} value="c1" onChange={() => {}} label="Cliente" />);
    expect(screen.getByRole("combobox")).toHaveValue("Acme Spa");
  });
});
