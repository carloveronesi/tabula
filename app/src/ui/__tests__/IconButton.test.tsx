import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IconButton } from "@/ui/IconButton";

describe("IconButton", () => {
  it("usa label come aria-label", () => {
    render(<IconButton label="Precedente">‹</IconButton>);
    expect(screen.getByRole("button", { name: "Precedente" })).toBeInTheDocument();
  });

  it("inoltra onClick", () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Successivo" onClick={onClick}>
        ›
      </IconButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Successivo" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
