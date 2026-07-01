import type {
  Client,
  Contact,
  DayMeta,
  Entry,
  Person,
  Project,
  Recurrence,
  Settings,
  Todo,
} from "@/data/types";
import type { ImportResult } from "@/data/import/importer";
import { EXPORT_FORMAT, EXPORT_VERSION } from "@/data/export/buildExport";
import { migrateSettings } from "@/data/settings";

/** Vero se l'oggetto è un export nativo di Tabula (non il formato legacy). */
export function isNativeExport(raw: unknown): boolean {
  return (
    !!raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw as Record<string, unknown>).format === EXPORT_FORMAT
  );
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Importa un export nativo. È già il nostro modello: passthrough tipizzato con
 * difese (sezioni mancanti → array vuoti, settings null → default). Valida la
 * versione per non scrivere dati di un formato futuro non capito.
 */
export function importFromNative(raw: Record<string, unknown>): ImportResult {
  if (raw.version !== EXPORT_VERSION) {
    throw new Error(
      `Versione di export non supportata: ${String(raw.version)} (attesa ${EXPORT_VERSION}).`,
    );
  }
  return {
    entries: arr<Entry>(raw.entries),
    clients: arr<Client>(raw.clients),
    projects: arr<Project>(raw.projects),
    people: arr<Person>(raw.people),
    contacts: arr<Contact>(raw.contacts),
    recurrences: arr<Recurrence>(raw.recurrences),
    todos: arr<Todo>(raw.todos),
    days: arr<DayMeta>(raw.days),
    settings: migrateSettings(raw.settings as Settings | null),
  };
}
