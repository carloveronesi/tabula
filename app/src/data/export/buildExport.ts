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

export const EXPORT_FORMAT = "tabula" as const;
export const EXPORT_VERSION = 1 as const;

/** Dati grezzi da esportare (così come stanno nelle tabelle). */
export interface ExportData {
  entries: Entry[];
  clients: Client[];
  projects: Project[];
  people: Person[];
  contacts: Contact[];
  recurrences: Recurrence[];
  todos: Todo[];
  days: DayMeta[];
  settings: Settings | null;
}

/** Documento di export nativo di Tabula: versionato e autodescrittivo. */
export interface TabulaExport extends ExportData {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string; // ISO 8601 UTC
}

export const emptyExportData = (): ExportData => ({
  entries: [],
  clients: [],
  projects: [],
  people: [],
  contacts: [],
  recurrences: [],
  todos: [],
  days: [],
  settings: null,
});

/**
 * Assembla il documento di export nativo. Puro: niente lettura DB né `Date.now`
 * (l'istante arriva da fuori), così è deterministico e testabile.
 */
export function buildExport(data: ExportData, now: number): TabulaExport {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date(now).toISOString(),
    entries: data.entries,
    clients: data.clients,
    projects: data.projects,
    people: data.people,
    contacts: data.contacts,
    recurrences: data.recurrences,
    todos: data.todos,
    days: data.days,
    settings: data.settings,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Nome file con la data locale: `tabula-export-YYYY-MM-DD.json`. */
export function exportFilename(at: Date): string {
  const ymd = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  return `tabula-export-${ymd}.json`;
}
