import { create } from "zustand";
import type { Entry, ISODateTime } from "@/data/types";
import { entriesInRange } from "@/data/repositories";

interface CalendarState {
  entries: Entry[];
  loadRange: (from: ISODateTime, to: ISODateTime) => Promise<void>;
}

/**
 * Stato delle entry visibili nel periodo corrente.
 * Le viste caricano l'intervallo che mostrano (giorno/settimana/mese).
 */
export const useCalendarStore = create<CalendarState>((set) => ({
  entries: [],
  loadRange: async (from, to) => {
    const entries = await entriesInRange(from, to);
    set({ entries });
  },
}));
