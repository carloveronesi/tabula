import type {
  SourceClient,
  SourceDay,
  SourcePerson,
  SourceProject,
  SourceSettings,
  SourceTodo,
} from "@/data/import/sourceTypes";

/** Risultato del parsing dell'export: mesi separati dalle sezioni meta. */
export interface ParsedExport {
  months: Record<string, Record<string, SourceDay>>; // "YYYY-MM" → byDate
  settings: SourceSettings | null;
  projects: Record<string, SourceProject> | null;
  clients: Record<string, SourceClient> | null;
  people: SourcePerson[];
  todos: SourceTodo[];
}

const MONTH_RE = /^dailylog:v1:(\d{4}-\d{2})$/;

/** I valori dell'export sono stringhe JSON; tollera anche oggetti già parsati e JSON rotto. */
function parseValue<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

export function parseExport(raw: Record<string, unknown>): ParsedExport {
  const out: ParsedExport = {
    months: {},
    settings: null,
    projects: null,
    clients: null,
    people: [],
    todos: [],
  };

  for (const [key, value] of Object.entries(raw)) {
    const month = MONTH_RE.exec(key);
    if (month) {
      const parsed = parseValue<{ byDate?: Record<string, SourceDay> }>(value);
      if (parsed?.byDate) out.months[month[1]] = parsed.byDate;
      continue;
    }

    switch (key) {
      case "dailylog:v1:__settings":
        out.settings = parseValue<SourceSettings>(value);
        break;
      case "dailylog:v1:__projects":
        out.projects = parseValue<Record<string, SourceProject>>(value);
        break;
      case "dailylog:v1:__clients":
        out.clients = parseValue<Record<string, SourceClient>>(value);
        break;
      case "dailylog:v1:__people":
        out.people = parseValue<SourcePerson[]>(value) ?? [];
        break;
      case "dailylog_todos":
        out.todos = parseValue<SourceTodo[]>(value) ?? [];
        break;
      default:
        // sezioni interne e chiavi sconosciute: ignorate
        break;
    }
  }

  return out;
}
