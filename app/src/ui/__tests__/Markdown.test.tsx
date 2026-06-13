import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "@/ui/Markdown";

describe("Markdown", () => {
  it("rende grassetto, elenco e link (renderer in lazy)", async () => {
    const { container } = render(
      <Markdown>{"**forte**\n\n- uno\n- due\n\n[doc](http://x)"}</Markdown>,
    );
    // il renderer è caricato in lazy: attende che il chunk risolva
    const link = await screen.findByRole("link", { name: "doc" }, { timeout: 5000 });
    expect(link).toHaveAttribute("href", "http://x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(container.querySelector("strong")).toHaveTextContent("forte");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("supporta le tabelle GFM", async () => {
    render(<Markdown>{"| a | b |\n|---|---|\n| 1 | 2 |"}</Markdown>);
    expect(
      await screen.findByRole("table", undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
