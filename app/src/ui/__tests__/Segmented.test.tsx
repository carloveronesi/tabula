import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Segmented } from "@/ui/Segmented";

const OPTS = [
  { id: "day", label: "Giorno" },
  { id: "week", label: "Settimana" },
  { id: "month", label: "Mese" },
];

describe("Segmented", () => {
  it("rende tutte le opzioni e marca l'attiva con aria-pressed", () => {
    render(<Segmented options={OPTS} value="week" onChange={() => {}} />);
    expect(screen.getByText("Giorno")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Settimana")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("chiama onChange con l'id al click", () => {
    const onChange = vi.fn();
    render(<Segmented options={OPTS} value="day" onChange={onChange} />);
    fireEvent.click(screen.getByText("Mese"));
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("espone il gruppo con l'etichetta", () => {
    render(
      <Segmented options={OPTS} value="day" onChange={() => {}} label="Vista" />,
    );
    expect(screen.getByRole("group", { name: "Vista" })).toBeInTheDocument();
  });
});
