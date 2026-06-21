import { create } from "zustand";
import type { ISODate, Location } from "@/data/types";
import {
  dayMetasInRange,
  deleteDayMeta,
  putDayMeta,
} from "@/data/repositories";

interface PresenceState {
  /** Sede per data (solo i giorni con sede registrata nel periodo caricato). */
  metas: Record<ISODate, Location>;
  loadRange: (from: ISODate, to: ISODate) => Promise<void>;
  setLocation: (date: ISODate, location: Location | null) => Promise<void>;
}

/**
 * Sedi delle giornate nel periodo mostrato. `loadRange` segue la vista come per
 * le entry; `setLocation` scrive (o, con `null`, cancella) la sede di un giorno
 * aggiornando DB e mappa in memoria.
 */
export const usePresenceStore = create<PresenceState>((set, get) => ({
  metas: {},
  loadRange: async (from, to) => {
    const rows = await dayMetasInRange(from, to);
    const metas: Record<ISODate, Location> = {};
    for (const r of rows) if (r.location) metas[r.date] = r.location;
    set({ metas });
  },
  setLocation: async (date, location) => {
    if (location) {
      await putDayMeta({ date, location });
      set({ metas: { ...get().metas, [date]: location } });
    } else {
      await deleteDayMeta(date);
      const next = { ...get().metas };
      delete next[date];
      set({ metas: next });
    }
  },
}));
