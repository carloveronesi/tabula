import type { AiSettings, Id } from "@/data/types";
import { chat } from "@/domain/ai/client";

/** Anagrafica passata al modello: sceglie fra questi id, non ne inventa. */
export interface ParseInventory {
  clients: { id: Id; name: string }[];
  projects: { id: Id; name: string; clientId: Id | null }[];
  subtypes: { id: Id; label: string }[];
}

/**
 * Quello che il modello può proporre. `dayOffset` è uno **scarto in giorni**
 * rispetto alla data dello slot, non una data: le date assolute i modelli le
 * sbagliano con sicurezza, e l'errore si scopre a consuntivo.
 */
export interface EntryHints {
  title: string;
  dayOffset: number;
  startMin: number | null;
  durationMin: number | null;
  kind: "client" | "internal";
  clientId: Id | null;
  projectId: Id | null;
  subtypeId: Id | null;
}

function asObject(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/** "15:00" / "9" → minuti dalla mezzanotte; null se non è un orario. */
function toMinutes(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Valida la risposta del modello contro l'anagrafica reale. Ogni campo che non
 * regge diventa `null`: un campo vuoto lo correggi in due secondi, uno pieno ma
 * sbagliato lo salvi senza guardarlo. Pura.
 */
export function coerceHints(
  raw: unknown,
  inv: ParseInventory,
  fallbackTitle: string,
): EntryHints {
  const o = asObject(raw);

  const title = typeof o.title === "string" && o.title.trim() !== "" ? o.title.trim() : fallbackTitle;

  const dayOffset =
    typeof o.dayOffset === "number" && Number.isInteger(o.dayOffset) && Math.abs(o.dayOffset) <= 31
      ? o.dayOffset
      : 0;

  const durationMin =
    typeof o.durationMin === "number" && o.durationMin >= 1 && o.durationMin <= 1440
      ? Math.floor(o.durationMin)
      : null;

  // Il progetto è il segnale più specifico: quando c'è, cliente e modalità si
  // deducono da lui e non da `kind`/`clientId`, che il modello può contraddire.
  // Garantisce l'invariante che il popover si aspetta: il progetto appartiene
  // sempre al cliente selezionato.
  const project = inv.projects.find((p) => p.id === o.projectId) ?? null;
  const kind: EntryHints["kind"] =
    project !== null
      ? project.clientId === null
        ? "internal"
        : "client"
      : o.kind === "internal"
        ? "internal"
        : "client";

  const clientId = project !== null
    ? project.clientId
    : kind === "client"
      ? (inv.clients.find((c) => c.id === o.clientId)?.id ?? null)
      : null;

  return {
    title,
    dayOffset,
    startMin: toMinutes(o.start),
    durationMin,
    kind,
    clientId,
    projectId: project?.id ?? null,
    subtypeId: inv.subtypes.find((s) => s.id === o.subtypeId)?.id ?? null,
  };
}

function lines(inv: ParseInventory): string {
  const clients = inv.clients.map((c) => `- ${c.id} = ${c.name}`).join("\n") || "- (nessuno)";
  const projects =
    inv.projects
      .map((p) => `- ${p.id} = ${p.name}${p.clientId ? ` (cliente ${p.clientId})` : " (interno)"}`)
      .join("\n") || "- (nessuno)";
  const subtypes = inv.subtypes.map((s) => `- ${s.id} = ${s.label}`).join("\n") || "- (nessuno)";
  return `CLIENTI:\n${clients}\n\nPROGETTI:\n${projects}\n\nSOTTOTIPI:\n${subtypes}`;
}

const RULES = `Estrai i dati di un'attività di lavoro dalla frase dell'utente.
Rispondi SOLO con un oggetto JSON, senza commenti né blocchi di codice, con queste chiavi:
- "title": la frase ripulita da orari, durate e nomi di cliente/progetto (sono campi a parte)
- "dayOffset": intero, giorni rispetto al giorno che l'utente sta compilando ("ieri" = -1, "oggi"/non detto = 0)
- "start": orario d'inizio "HH:MM", null se non detto
- "durationMin": durata in minuti, null se non detta
- "kind": "client" oppure "internal"
- "clientId", "projectId", "subtypeId": SOLO id presenti negli elenchi qui sotto, altrimenti null

Non inventare id: se il cliente o il progetto nominato non è in elenco, rispondi null.`;

/** Frase libera → proposta validata. Gli errori del client arrivano al chiamante. */
export async function parseEntry(
  text: string,
  inv: ParseInventory,
  cfg: AiSettings,
  signal?: AbortSignal,
): Promise<EntryHints> {
  const reply = await chat(
    cfg,
    [
      { role: "system", content: `${RULES}\n\n${lines(inv)}` },
      { role: "user", content: text },
    ],
    signal,
  );
  // I modelli incartano il JSON in ```json anche quando gli dici di non farlo.
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  let raw: unknown = null;
  if (start !== -1 && end > start) {
    try {
      raw = JSON.parse(reply.slice(start, end + 1));
    } catch {
      raw = null;
    }
  }
  return coerceHints(raw, inv, text);
}
