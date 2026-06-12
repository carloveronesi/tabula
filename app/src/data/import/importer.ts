/**
 * Importer: trasforma un file JSON di export nel modello dati dell'app.
 *
 * Stato: entry/clienti/progetti/persone/giorni completi.
 * Rinviati (vuoti per ora): contatti, ricorrenze, todo, settings.
 */
import { nanoid } from "nanoid";
import type {
  Client,
  Contact,
  DayMeta,
  Entry,
  Id,
  ISODate,
  Person,
  Project,
  Recurrence,
  Todo,
} from "@/data/types";
import { parseExport, type ParsedExport } from "@/data/import/parseExport";
import { buildInventory } from "@/data/import/buildInventory";
import { dayToRanges, type DaySlotConfig } from "@/data/import/dayToRanges";
import { resolveEntry } from "@/data/import/resolveEntry";
import { mapTodos } from "@/data/import/mapTodos";
import { buildContacts } from "@/data/import/buildContacts";

export interface ImportResult {
  entries: Entry[];
  clients: Client[];
  projects: Project[];
  people: Person[];
  contacts: Contact[];
  recurrences: Recurrence[];
  todos: Todo[];
  days: DayMeta[];
}

export interface ImportOptions {
  makeId?: () => Id;
  now?: number;
}

const DEFAULT_SLOT_CONFIG: DaySlotConfig = {
  morningStart: 540,
  morningEnd: 780,
  afternoonStart: 840,
  afternoonEnd: 1080,
  slotMinutes: 30,
};

/** Ricava i confini orari dai settings, con fallback ai default. */
export function slotConfigFromSettings(
  settings: ParsedExport["settings"],
): DaySlotConfig {
  const wh =
    settings && typeof settings.workHours === "object"
      ? (settings.workHours as Record<string, number>)
      : {};
  const slot = settings?.slotMinutes;
  return {
    morningStart: wh.morningStart ?? DEFAULT_SLOT_CONFIG.morningStart,
    morningEnd: wh.morningEnd ?? DEFAULT_SLOT_CONFIG.morningEnd,
    afternoonStart: wh.afternoonStart ?? DEFAULT_SLOT_CONFIG.afternoonStart,
    afternoonEnd: wh.afternoonEnd ?? DEFAULT_SLOT_CONFIG.afternoonEnd,
    slotMinutes: typeof slot === "number" ? slot : DEFAULT_SLOT_CONFIG.slotMinutes,
  };
}

export function importFromExport(
  raw: Record<string, unknown>,
  opts: ImportOptions = {},
): ImportResult {
  const makeId = opts.makeId ?? (() => nanoid());
  const now = opts.now ?? Date.now();

  const parsed = parseExport(raw);
  const inventory = buildInventory(parsed, makeId, now);
  const config = slotConfigFromSettings(parsed.settings);

  const { contacts } = buildContacts(parsed, inventory.clientIdByKey, makeId);

  const entries: Entry[] = [];
  const days: DayMeta[] = [];

  for (const byDate of Object.values(parsed.months)) {
    for (const [date, day] of Object.entries(byDate)) {
      days.push({ date: date as ISODate, location: day.location ?? null });
      for (const range of dayToRanges(date, day, config)) {
        entries.push({
          id: makeId(),
          startsAt: range.startsAt,
          endsAt: range.endsAt,
          createdAt: now,
          updatedAt: now,
          ...resolveEntry(range.entry, inventory),
        });
      }
    }
  }

  return {
    entries,
    clients: inventory.clients,
    projects: inventory.projects,
    people: inventory.people,
    contacts,
    recurrences: [],
    todos: mapTodos(parsed.todos, inventory),
    days,
  };
}
