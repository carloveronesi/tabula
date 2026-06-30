/**
 * Rileva le sovrapposizioni tra le righe di un import e: (a) le attività già nel
 * calendario, (b) le altre righe dello stesso import. L'import bypassa il blocco
 * dell'editor, quindi è qui che l'utente vede i conflitti prima di creare.
 */
import type { Entry, ISODate } from "@/data/types";
import { conflictsOnDay } from "@/domain/conflict";

export interface ImportInterval {
  key: string;
  date: ISODate;
  startMin: number;
  endMin: number;
}

/** Mappa chiave→motivo per le sole righe in conflitto (vuota = nessuna). */
export function findConflicts(
  ivs: ImportInterval[],
  entries: Entry[],
): Map<string, string> {
  const out = new Map<string, string>();
  ivs.forEach((a, i) => {
    const vsExisting = conflictsOnDay(a.date, a.startMin, a.endMin, entries, null);
    const vsRow = ivs.some(
      (b, j) =>
        j !== i &&
        b.date === a.date &&
        a.startMin < b.endMin &&
        b.startMin < a.endMin,
    );
    if (vsExisting && vsRow)
      out.set(a.key, "Si sovrappone a un'attività esistente e a un'altra riga");
    else if (vsExisting)
      out.set(a.key, "Si sovrappone a un'attività esistente");
    else if (vsRow) out.set(a.key, "Si sovrappone a un'altra riga importata");
  });
  return out;
}
