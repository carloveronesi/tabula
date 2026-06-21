import { create } from "zustand";
import { clearTimer, getTimer, putTimer } from "@/data/repositories";

interface TimerState {
  /** Momento di avvio (epoch ms) se un timer è in corso; `null` altrimenti. */
  startedAt: number | null;
  /** Legge il timer persistito al mount (sopravvive a reload/chiusura PWA). */
  load: () => Promise<void>;
  /** Avvia il conteggio adesso (no-op se già in corso). */
  start: () => Promise<void>;
  /** Ferma e restituisce avvio/stop per pre-compilare l'editor; `null` se fermo. */
  stop: () => Promise<{ startedAt: number; stoppedAt: number } | null>;
  /** Annulla senza creare nulla. */
  cancel: () => Promise<void>;
}

/**
 * Stato del timer "in corso". Persistito su IndexedDB come record singolo: la
 * fonte di verità è il solo `startedAt`, il tempo trascorso si deriva da `now`
 * in UI. Allo stop tocca al chiamante creare la Entry dalla fascia restituita.
 */
export const useTimerStore = create<TimerState>((set, get) => ({
  startedAt: null,
  load: async () => {
    const timer = await getTimer();
    set({ startedAt: timer?.startedAt ?? null });
  },
  start: async () => {
    if (get().startedAt !== null) return;
    const startedAt = Date.now();
    await putTimer({ id: "active", startedAt });
    set({ startedAt });
  },
  stop: async () => {
    const startedAt = get().startedAt;
    if (startedAt === null) return null;
    const stoppedAt = Date.now();
    await clearTimer();
    set({ startedAt: null });
    return { startedAt, stoppedAt };
  },
  cancel: async () => {
    await clearTimer();
    set({ startedAt: null });
  },
}));
