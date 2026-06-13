import { create } from "zustand";
import type { Entry, Id, ISODateTime } from "@/data/types";
import { deleteEntry, entriesInRange, putEntry } from "@/data/repositories";
import {
  emptyHistory,
  record,
  undo as undoHistory,
  redo as redoHistory,
  type Change,
  type History,
} from "@/domain/history";

interface CalendarState {
  entries: Entry[];
  history: History<Entry>;
  loadRange: (from: ISODateTime, to: ISODateTime) => Promise<void>;
  saveEntry: (entry: Entry) => Promise<void>;
  removeEntry: (id: Id) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const upsert = (entries: Entry[], entry: Entry): Entry[] => [
  ...entries.filter((e) => e.id !== entry.id),
  entry,
];

/**
 * Applica uno stato `target` (la entry da scrivere, o `null` per eliminarla) sia
 * su IndexedDB sia sullo stato in memoria. Non tocca lo storico: serve sia alle
 * azioni normali sia a undo/redo per non ri-registrarsi.
 */
async function applyState(
  entries: Entry[],
  id: Id,
  target: Entry | null,
): Promise<Entry[]> {
  if (target) {
    await putEntry(target);
    return upsert(entries, target);
  }
  await deleteEntry(id);
  return entries.filter((e) => e.id !== id);
}

const changeId = (c: Change<Entry>): Id => (c.before ?? c.after)!.id;

/**
 * Stato delle entry visibili nel periodo corrente.
 * Le viste caricano l'intervallo che mostrano (giorno/settimana/mese);
 * salvataggio/eliminazione aggiornano DB e stato in memoria e registrano un
 * passo nello storico undo/redo. `loadRange` non altera lo storico.
 */
export const useCalendarStore = create<CalendarState>((set, get) => ({
  entries: [],
  history: emptyHistory<Entry>(),
  loadRange: async (from, to) => {
    const entries = await entriesInRange(from, to);
    set({ entries });
  },
  saveEntry: async (entry) => {
    const before = get().entries.find((e) => e.id === entry.id) ?? null;
    const entries = await applyState(get().entries, entry.id, entry);
    set((s) => ({
      entries,
      history: record(s.history, { before, after: entry }),
    }));
  },
  removeEntry: async (id) => {
    const before = get().entries.find((e) => e.id === id) ?? null;
    const entries = await applyState(get().entries, id, null);
    set((s) => ({
      entries,
      history: before
        ? record(s.history, { before, after: null })
        : s.history,
    }));
  },
  undo: async () => {
    const result = undoHistory(get().history);
    if (!result) return;
    const entries = await applyState(
      get().entries,
      changeId(result.change),
      result.change.before,
    );
    set({ entries, history: result.history });
  },
  redo: async () => {
    const result = redoHistory(get().history);
    if (!result) return;
    const entries = await applyState(
      get().entries,
      changeId(result.change),
      result.change.after,
    );
    set({ entries, history: result.history });
  },
}));
