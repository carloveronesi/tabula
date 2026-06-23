import type { Entry, EntryType } from "@/data/types";
import { durationMinutes } from "@/domain/time";
import { entryColor, type ColorMaps } from "@/domain/colors";

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
  /** Colore del gruppo (come i blocchi in timeline); `null` → accento default. */
  color: string | null;
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
): DayBreakdown {
  let totalMin = 0;
  const groups = new Map<string, BreakdownRow>();

  for (const e of entries) {
    const min = durationMinutes(e);
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
      groups.set(key, { key, label, color: entryColor(e, maps), minutes: min });
    }
  }

  return {
    totalMin,
    count: entries.length,
    rows: [...groups.values()].sort((a, b) => b.minutes - a.minutes),
  };
}
