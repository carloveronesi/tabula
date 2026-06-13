import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownEditor } from "@/ui/MarkdownEditor";

describe("MarkdownEditor", () => {
  it("inoltra le modifiche di testo", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} label="Note" />);
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "ciao" },
    });
    expect(onChange).toHaveBeenCalledWith("ciao");
  });

  it("il pulsante Grassetto avvolge la selezione", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="abc" onChange={onChange} label="Note" />);
    const ta = screen.getByLabelText("Note") as HTMLTextAreaElement;
    ta.setSelectionRange(0, 3);
    fireEvent.click(screen.getByRole("button", { name: "Grassetto" }));
    expect(onChange).toHaveBeenCalledWith("**abc**");
  });

  it("Elenco aggiunge il prefisso a inizio riga", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="riga" onChange={onChange} label="Note" />);
    const ta = screen.getByLabelText("Note") as HTMLTextAreaElement;
    ta.setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole("button", { name: "Elenco" }));
    expect(onChange).toHaveBeenCalledWith("- riga");
  });

  it("Anteprima mostra il markdown reso", async () => {
    render(<MarkdownEditor value="**x**" onChange={() => {}} label="Note" />);
    fireEvent.click(screen.getByRole("button", { name: "Anteprima" }));
    expect(screen.queryByLabelText("Note")).not.toBeInTheDocument();
    // renderer in lazy: attende il chunk e lo <strong>
    expect(
      (await screen.findByText("x", undefined, { timeout: 5000 })).tagName,
    ).toBe("STRONG");
  });
});
