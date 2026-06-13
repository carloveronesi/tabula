import { importFromExport } from "@/data/import/importer";
import { persistImport } from "@/data/persistImport";

export interface ImportSummary {
  entries: number;
  clients: number;
  projects: number;
  people: number;
  contacts: number;
  todos: number;
  days: number;
}

/**
 * Orchestrazione dell'import dal testo di un file di export:
 * parse JSON → modello dell'app → persistenza su IndexedDB. Restituisce il
 * conteggio di ciò che è stato scritto. Solleva messaggi leggibili sugli errori
 * di formato (la UI li mostra all'utente).
 */
export async function importExportFile(text: string): Promise<ImportSummary> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("File non valido: JSON non leggibile.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Formato non riconosciuto: atteso un oggetto di export.");
  }

  const result = importFromExport(raw as Record<string, unknown>);
  await persistImport(result);

  return {
    entries: result.entries.length,
    clients: result.clients.length,
    projects: result.projects.length,
    people: result.people.length,
    contacts: result.contacts.length,
    todos: result.todos.length,
    days: result.days.length,
  };
}
