import { create } from "zustand";
import type { Entry, Id, ISODateTime } from "@/data/types";
import { deleteEntry, entriesInRange, putEntry } from "@/data/repositories";

interface CalendarState {
  entries: Entry[];
  loadRange: (from: ISODateTime, to: ISODateTime) => Promise<void>;
  saveEntry: (entry: Entry) => Promise<void>;
  removeEntry: (id: Id) => Promise<void>;
}

/**
 * Stato delle entry visibili nel periodo corrente.
 * Le viste caricano l'intervallo che mostrano (giorno/settimana/mese);
 * salvataggio/eliminazione aggiornano DB e stato in memoria.
 */
export const useCalendarStore = create<CalendarState>((set) => ({
  entries: [],
  loadRange: async (from, to) => {
    const entries = await entriesInRange(from, to);
    set({ entries });
  },
  saveEntry: async (entry) => {
    await putEntry(entry);
    set((s) => {
      const rest = s.entries.filter((e) => e.id !== entry.id);
      return { entries: [...rest, entry] };
    });
  },
  removeEntry: async (id) => {
    await deleteEntry(id);
    set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
  },
}));
