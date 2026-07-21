import type { Entry, EntryType } from "@/data/types";
import { workedMinutes } from "@/domain/time";
import type { WorkHours } from "@/domain/slots";
import { entryGroupColor, type ColorMaps } from "@/domain/colors";

const TYPE_LABEL: Record<EntryType, string> = {
  client: "Cliente",
  internal: "Interno",
  event: "Evento",
  vacation: "Ferie",
};

export interface BreakdownRow {
  /** Chiave stabile del gruppo (cliente/sottotipo/tipo). */
  key: string;
  label: string;
  /** Colore del gruppo: del cliente/sottotipo, o tinta del tipo come fallback. */
  color: string;
  minutes: number;
}

export interface DayBreakdown {
  totalMin: number;
  /** Numero di attività della giornata. */
  count: number;
  /** Righe per cliente/sottotipo, ordinate per minuti decrescenti. */
  rows: BreakdownRow[];
}

export interface BreakdownNames {
  clientName: (id: string) => string;
  subtypeLabel: (id: string) => string;
}

/**
 * Etichetta specifica di una entry per cliente/sottotipo: nome del cliente
 * (`type=client`) o del sottotipo (`type=internal`). `null` per ferie/evento o
 * entry non assegnate, dove un'etichetta generica sarebbe solo rumore.
 */
export function entryLabel(entry: Entry, names: BreakdownNames): string | null {
  if (entry.type === "client" && entry.clientId) return names.clientName(entry.clientId);
  if (entry.type === "internal" && entry.subtypeId) return names.subtypeLabel(entry.subtypeId);
  return null;
}

/**
 * Ripartizione del tempo di una giornata, raggruppando le entry sulla stessa
 * dimensione-colore dei blocchi in timeline: per cliente (`type=client`), per
 * sottotipo (`type=internal`), altrimenti per tipo (ferie/evento). Logica pura:
 * chi chiama passa le entry già filtrate al giorno e i resolver dei nomi.
 */
export function dayBreakdown(
  entries: Entry[],
  maps: ColorMaps,
  names: BreakdownNames,
  wh: WorkHours,
): DayBreakdown {
  let totalMin = 0;
  const groups = new Map<string, BreakdownRow>();

  for (const e of entries) {
    const min = workedMinutes(e, wh);
    totalMin += min;

    let key: string;
    if (e.type === "client" && e.clientId) {
      key = `client:${e.clientId}`;
    } else if (e.type === "internal" && e.subtypeId) {
      key = `internal:${e.subtypeId}`;
    } else {
      key = `type:${e.type}`;
    }
    const label = entryLabel(e, names) ?? TYPE_LABEL[e.type];

    const existing = groups.get(key);
    if (existing) {
      existing.minutes += min;
    } else {
      // Stessa dimensione-colore dei blocchi in timeline (per cliente/sottotipo).
      groups.set(key, { key, label, color: entryGroupColor(e, maps), minutes: min });
    }
  }

  return {
    totalMin,
    count: entries.length,
    rows: [...groups.values()].sort((a, b) => b.minutes - a.minutes),
  };
}
