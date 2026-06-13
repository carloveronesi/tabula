import { create } from "zustand";
import { nanoid } from "nanoid";

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface Toast {
  id: string;
  message: string;
  action?: ToastAction;
  variant?: "default" | "danger";
}

interface ToastOptions {
  action?: ToastAction;
  variant?: Toast["variant"];
}

interface ToastState {
  toasts: Toast[];
  /** Mostra un toast e ne restituisce l'id (per un eventuale dismiss manuale). */
  notify: (message: string, opts?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

/**
 * Coda dei messaggi effimeri (conferme di salvataggio/spostamento/eliminazione).
 * L'auto-dismiss temporizzato vive nel componente `Toaster`; qui solo la coda,
 * così lo store resta puro e testabile.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notify: (message, opts) => {
    const id = nanoid();
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id, message, action: opts?.action, variant: opts?.variant },
      ],
    }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
