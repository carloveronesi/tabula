import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "@/ui/Markdown";

describe("Markdown", () => {
  it("rende grassetto, elenco e link", () => {
    const { container } = render(
      <Markdown>{"**forte**\n\n- uno\n- due\n\n[doc](http://x)"}</Markdown>,
    );
    expect(container.querySelector("strong")).toHaveTextContent("forte");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    const link = screen.getByRole("link", { name: "doc" });
    expect(link).toHaveAttribute("href", "http://x");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("supporta le tabelle GFM", () => {
    const { container } = render(
      <Markdown>{"| a | b |\n|---|---|\n| 1 | 2 |"}</Markdown>,
    );
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});
