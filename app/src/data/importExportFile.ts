import { importFromExport } from "@/data/import/importer";
import { importFromNative, isNativeExport } from "@/data/import/fromNativeExport";
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
 * parse JSON → modello dell'app → persistenza su IndexedDB. Riconosce sia il
 * formato nativo di Tabula (round-trip dell'export) sia quello legacy
 * `dailylog:v1:`. Restituisce il conteggio di ciò che è stato scritto e solleva
 * messaggi leggibili sugli errori di formato (la UI li mostra all'utente).
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

  const obj = raw as Record<string, unknown>;
  const result = isNativeExport(obj)
    ? importFromNative(obj)
    : importFromExport(obj);
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
