import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toaster } from "@/ui/Toaster";
import { useToastStore } from "@/store/toast";

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Toaster", () => {
  it("non mostra nulla senza toast", () => {
    render(<Toaster />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it("mostra il messaggio del toast", () => {
    render(<Toaster />);
    act(() => {
      useToastStore.getState().notify("Salvato");
    });
    expect(screen.getByText("Salvato")).toBeInTheDocument();
  });

  it("il bottone azione esegue il callback e chiude il toast", () => {
    const run = vi.fn();
    render(<Toaster />);
    act(() => {
      useToastStore.getState().notify("Spostata", {
        action: { label: "Annulla", run },
      });
    });

    fireEvent.click(screen.getByText("Annulla"));
    expect(run).toHaveBeenCalledOnce();
    expect(screen.queryByText("Spostata")).toBeNull();
  });

  it("il bottone chiudi rimuove il toast", () => {
    render(<Toaster />);
    act(() => {
      useToastStore.getState().notify("Eliminata");
    });
    fireEvent.click(screen.getByLabelText("Chiudi notifica"));
    expect(screen.queryByText("Eliminata")).toBeNull();
  });

  it("si auto-chiude dopo il timeout", () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      useToastStore.getState().notify("Creata");
    });
    expect(screen.getByText("Creata")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Creata")).toBeNull();
  });
});
