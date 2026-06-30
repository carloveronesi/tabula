/**
 * Helper condivisi dai modali di import (calendario, Teams) per collegare una
 * riga a una persona/contatto. Il valore in UI è la stringa `"kind:id"` (comodo
 * per il Combobox); qui si converte da/verso `PersonMatch`.
 */
import { useMemo } from "react";
import type { MatchKind, PersonMatch } from "@/domain/teams/matchPerson";
import type { ComboboxOption } from "@/ui";
import { useInventoryStore } from "@/store/inventory";

/** Da `PersonMatch` al valore `"kind:id"` del Combobox, o null se non collegato. */
export function matchValueOf(match: PersonMatch | null): string | null {
  return match ? `${match.kind}:${match.id}` : null;
}

export interface MatchHelpers {
  /** Opzioni del Combobox: persone poi contatti, id `"kind:id"`. */
  options: ComboboxOption[];
  /** Dal valore `"kind:id"` alla coppia tipizzata, o null. */
  decode: (value: string | null) => PersonMatch | null;
}

/** Opzioni e decoder memoizzati sull'anagrafica corrente. */
export function useMatchHelpers(): MatchHelpers {
  const people = useInventoryStore((s) => s.people);
  const contacts = useInventoryStore((s) => s.contacts);
  return useMemo(() => {
    const nameOf = (kind: MatchKind, id: string) =>
      (kind === "person"
        ? people.find((p) => p.id === id)?.name
        : contacts.find((c) => c.id === id)?.name) ?? "";
    const options: ComboboxOption[] = [
      ...people.map((p) => ({ id: `person:${p.id}`, label: p.name })),
      ...contacts.map((c) => ({ id: `contact:${c.id}`, label: c.name })),
    ];
    const decode = (value: string | null): PersonMatch | null => {
      if (!value) return null;
      const sep = value.indexOf(":");
      const kind = value.slice(0, sep) as MatchKind;
      const id = value.slice(sep + 1);
      return { id, kind, name: nameOf(kind, id), confidence: 1 };
    };
    return { options, decode };
  }, [people, contacts]);
}
