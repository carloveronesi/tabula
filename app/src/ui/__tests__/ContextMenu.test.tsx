import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContextMenu } from "@/ui/ContextMenu";

const at = { x: 20, y: 30 };

describe("ContextMenu", () => {
  it("chiuso (at=null) non rende nulla", () => {
    render(<ContextMenu at={null} items={[]} onClose={vi.fn()} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("rende le voci e chiama onSelect (poi chiude) al click", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <ContextMenu
        at={at}
        onClose={onClose}
        items={[{ label: "Incolla qui", onSelect }]}
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Incolla qui" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Escape chiude", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu at={at} onClose={onClose} items={[{ label: "X", onSelect: vi.fn() }]} />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("un click fuori dal menu chiude", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu at={at} onClose={onClose} items={[{ label: "X", onSelect: vi.fn() }]} />,
    );
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("una voce disabilitata non scatta", () => {
    const onSelect = vi.fn();
    render(
      <ContextMenu
        at={at}
        onClose={vi.fn()}
        items={[{ label: "X", onSelect, disabled: true }]}
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "X" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
