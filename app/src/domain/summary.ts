import type { Entry, EntryType, Id } from "@/data/types";
import { durationMinutes } from "@/domain/time";

export interface TypeTotal {
  type: EntryType;
  minutes: number;
}
export interface ClientTotal {
  clientId: Id;
  minutes: number;
}
export interface ProjectTotal {
  projectId: Id;
  minutes: number;
}
export interface Summary {
  totalMin: number;
  byType: TypeTotal[];
  byClient: ClientTotal[];
  byProject: ProjectTotal[];
}

/**
 * Aggrega le durate delle entry per tipo, per cliente (solo quelle con
 * clientId) e per progetto (solo quelle con projectId). Liste ordinate per
 * minuti decrescenti. Logica pura, indipendente dal periodo: chi chiama passa
 * le entry già filtrate.
 */
export function summarize(entries: Entry[]): Summary {
  let totalMin = 0;
  const byTypeMap = new Map<EntryType, number>();
  const byClientMap = new Map<Id, number>();
  const byProjectMap = new Map<Id, number>();

  for (const e of entries) {
    const min = durationMinutes(e);
    totalMin += min;
    byTypeMap.set(e.type, (byTypeMap.get(e.type) ?? 0) + min);
    if (e.clientId) {
      byClientMap.set(e.clientId, (byClientMap.get(e.clientId) ?? 0) + min);
    }
    if (e.projectId) {
      byProjectMap.set(e.projectId, (byProjectMap.get(e.projectId) ?? 0) + min);
    }
  }

  const byMinutesDesc = <T extends { minutes: number }>(a: T, b: T) =>
    b.minutes - a.minutes;

  return {
    totalMin,
    byType: [...byTypeMap]
      .map(([type, minutes]) => ({ type, minutes }))
      .sort(byMinutesDesc),
    byClient: [...byClientMap]
      .map(([clientId, minutes]) => ({ clientId, minutes }))
      .sort(byMinutesDesc),
    byProject: [...byProjectMap]
      .map(([projectId, minutes]) => ({ projectId, minutes }))
      .sort(byMinutesDesc),
  };
}
