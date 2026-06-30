import type { Entry, EntryType, Id, ISODate, Location } from "@/data/types";
import { workedMinutes } from "@/domain/time";
import { minutesOfDay, buildSlots, type WorkHours } from "@/domain/slots";

/**
 * Report mensile per il pannello di riepilogo: totali, copertura della giornata
 * lavorativa, ripartizione per cliente (con sottotipi) e per tipo. Logica pura:
 * chi chiama passa le entry del mese e i giorni feriali già trascorsi.
 */

export interface SubtypeSlice {
  subtypeId: Id | null;
  minutes: number;
}

export interface ClientSlice {
  clientId: Id;
  minutes: number;
  bySubtype: SubtypeSlice[];
}

export interface TypeSlice {
  type: EntryType;
  minutes: number;
  bySubtype: SubtypeSlice[];
}

export interface Coverage {
  /** Giorni feriali trascorsi del mese: denominatore della copertura. */
  workingDays: number;
  /** Giorni feriali trascorsi con l'intera giornata lavorativa coperta. */
  filledDays: number;
  /** Quota di giorni compilati (0–100, arrotondata). */
  pct: number;
  /** Minuti attesi = giorni feriali trascorsi × durata della giornata. */
  expectedMin: number;
  /** Minuti registrati in quei giorni feriali. */
  registeredMin: number;
}

export interface MonthlyReport {
  /** Minuti totali registrati nel mese (tutte le entry passate). */
  totalMin: number;
  /** Giorni distinti con almeno un'attività. */
  activeDays: number;
  coverage: Coverage;
  /** Clienti ordinati per minuti decrescenti, con scomposizione per sottotipo. */
  byClient: ClientSlice[];
  /** Tipi non-cliente (interno/ferie/evento) con scomposizione per sottotipo. */
  byOtherType: TypeSlice[];
}

/** Filtro di evidenziazione pilotato dal riepilogo: per cliente, tipo o sede. */
export type SummaryFilter =
  | { kind: "client"; clientId: Id }
  | { kind: "type"; type: EntryType }
  | { kind: "location"; location: Location };

/**
 * Vero se l'entry rientra nel filtro corrente. Il filtro per sede è una
 * proprietà del giorno (non dell'entry): qui restituisce sempre `false` e va
 * gestito da chi conosce la sede del giorno.
 */
export function entryMatchesFilter(e: Entry, f: SummaryFilter): boolean {
  if (f.kind === "client") return e.clientId === f.clientId;
  if (f.kind === "type") return e.type === f.type;
  return false;
}

/** Durata della giornata lavorativa in minuti (mattino + pomeriggio). */
function dailyWorkMinutes(wh: WorkHours): number {
  return wh.morningEnd - wh.morningStart + (wh.afternoonEnd - wh.afternoonStart);
}

/** Vero se ogni slot lavorativo del giorno è coperto da almeno un'entry. */
function isDayFilled(
  dayEntries: Entry[],
  slots: number[],
  slotMinutes: number,
): boolean {
  if (dayEntries.length === 0) return false;
  const spans = dayEntries.map((e) => ({
    start: minutesOfDay(e.startsAt),
    end: minutesOfDay(e.endsAt),
  }));
  return slots.every((slotStart) => {
    const slotEnd = slotStart + slotMinutes;
    return spans.some((s) => s.start < slotEnd && slotStart < s.end);
  });
}

/** Aggiunge `minutes` al sottotipo `subtypeId` in `map`. */
function addSubtype(map: Map<Id | null, number>, subtypeId: Id | null, minutes: number): void {
  map.set(subtypeId, (map.get(subtypeId) ?? 0) + minutes);
}

/** Lista di SubtypeSlice ordinata per minuti decrescenti. */
function subtypeSlices(map: Map<Id | null, number>): SubtypeSlice[] {
  return [...map]
    .map(([subtypeId, minutes]) => ({ subtypeId, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

const OTHER_TYPES: EntryType[] = ["internal", "vacation", "event"];

export function monthlyReport(
  entries: Entry[],
  workingDatesElapsed: ISODate[],
  workHours: WorkHours,
  slotMinutes: number,
): MonthlyReport {
  let totalMin = 0;
  const activeDaySet = new Set<string>();
  const entriesByDay = new Map<string, Entry[]>();
  const clientMap = new Map<Id, { minutes: number; bySubtype: Map<Id | null, number> }>();
  const typeMap = new Map<EntryType, { minutes: number; bySubtype: Map<Id | null, number> }>();

  for (const e of entries) {
    const min = workedMinutes(e, workHours);
    const day = e.startsAt.slice(0, 10);
    totalMin += min;
    activeDaySet.add(day);
    const arr = entriesByDay.get(day);
    if (arr) arr.push(e);
    else entriesByDay.set(day, [e]);

    if (e.type === "client" && e.clientId) {
      let c = clientMap.get(e.clientId);
      if (!c) {
        c = { minutes: 0, bySubtype: new Map() };
        clientMap.set(e.clientId, c);
      }
      c.minutes += min;
      addSubtype(c.bySubtype, e.subtypeId, min);
    } else if (OTHER_TYPES.includes(e.type)) {
      let t = typeMap.get(e.type);
      if (!t) {
        t = { minutes: 0, bySubtype: new Map() };
        typeMap.set(e.type, t);
      }
      t.minutes += min;
      addSubtype(t.bySubtype, e.subtypeId, min);
    }
  }

  // Copertura: solo sui giorni feriali trascorsi.
  const slots = buildSlots(workHours, slotMinutes).all;
  let filledDays = 0;
  let registeredMin = 0;
  for (const date of workingDatesElapsed) {
    const dayEntries = entriesByDay.get(date) ?? [];
    for (const e of dayEntries) registeredMin += workedMinutes(e, workHours);
    if (isDayFilled(dayEntries, slots, slotMinutes)) filledDays += 1;
  }
  const workingDays = workingDatesElapsed.length;

  const byClient: ClientSlice[] = [...clientMap]
    .map(([clientId, v]) => ({
      clientId,
      minutes: v.minutes,
      bySubtype: subtypeSlices(v.bySubtype),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const byOtherType: TypeSlice[] = [...typeMap]
    .map(([type, v]) => ({ type, minutes: v.minutes, bySubtype: subtypeSlices(v.bySubtype) }))
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totalMin,
    activeDays: activeDaySet.size,
    coverage: {
      workingDays,
      filledDays,
      pct: workingDays > 0 ? Math.round((filledDays / workingDays) * 100) : 0,
      expectedMin: workingDays * dailyWorkMinutes(workHours),
      registeredMin,
    },
    byClient,
    byOtherType,
  };
}
