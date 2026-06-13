import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/ui/Button";

describe("Button", () => {
  it("rende il contenuto ed è type=button di default", () => {
    render(<Button>Salva</Button>);
    const btn = screen.getByRole("button", { name: "Salva" });
    expect(btn).toHaveAttribute("type", "button");
  });

  it("espone la variante via data-variant", () => {
    render(<Button variant="primary">Ok</Button>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-variant",
      "primary",
    );
  });

  it("inoltra onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Vai</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("non clicca da disabilitato", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        No
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
