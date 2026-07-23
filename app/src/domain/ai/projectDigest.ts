import type { Entry, Id, Project } from "@/data/types";
import type { ProjectStats } from "@/domain/projectStats";
import type { ProjectActivity } from "@/domain/projectActivity";
import type { WorkHours } from "@/domain/slots";
import { workedMinutes } from "@/domain/time";
import { formatHours } from "@/domain/format";
import { redactNames } from "@/domain/peopleInText";

export interface DigestInput {
  project: Project;
  stat: ProjectStats | undefined;
  activity: ProjectActivity | null;
  entries: Entry[];
  clientName: string | null;
  /** Oggi ("YYYY-MM-DD"): senza, "fermo da un mese" il modello non lo può dire. */
  today: string;
  subtypes: { id: Id; label: string }[];
  /** Persone e referenti in anagrafica: i loro nomi non escono dal browser. */
  people: { name: string }[];
  workHours: WorkHours;
}

/**
 * Chiave dei dati da cui è nato un riassunto: cambia quando cambia il lavoro
 * registrato sul progetto (attività aggiunte, spostate, allungate). Serve a
 * capire se il riassunto in cache è ancora attuale senza rifare la chiamata.
 * Pura.
 */
export function digestSignature(stat: ProjectStats | undefined): string {
  return `${stat?.count ?? 0}:${stat?.totalMin ?? 0}:${stat?.lastDate ?? "-"}`;
}

/**
 * Il progetto come testo per il modello: anagrafica, numeri già aggregati e
 * l'elenco delle attività. I titoli passano da `redactNames`, così i nomi di
 * colleghi e referenti restano nel browser.
 *
 * ponytail: nessun troncamento dell'elenco. Un progetto con 400 attività fa un
 * prompt lungo; se diventa un problema si tagliano le più vecchie, ma è proprio
 * lo storico che rende il riassunto utile e la cache lo fa pagare una volta.
 * Pura.
 */
export function buildDigest(inp: DigestInput): string {
  const { project: p, stat, activity, entries, subtypes, people, workHours } = inp;
  const label = (id: string | null) =>
    id ? (subtypes.find((s) => s.id === id)?.label ?? "Generico") : "Generico";

  const out: string[] = [
    `OGGI: ${inp.today}`,
    `PROGETTO: ${p.name}`,
    `CLIENTE: ${inp.clientName ?? "nessuno (progetto interno)"}`,
    `STATO: ${p.status}`,
  ];
  if (p.startDate || p.endDate) {
    out.push(`DATE PREVISTE: ${p.startDate || "?"} → ${p.endDate || "?"}`);
  }
  if (p.description.trim()) out.push(`DESCRIZIONE: ${p.description.trim()}`);
  if (p.objectives.trim()) out.push(`OBIETTIVI: ${p.objectives.trim()}`);

  const logged = stat?.totalMin ?? 0;
  out.push(
    `ORE REGISTRATE: ${formatHours(logged)} su ${stat?.count ?? 0} attività` +
      (stat?.firstDate ? ` (dal ${stat.firstDate} al ${stat.lastDate})` : ""),
  );
  if (p.estimatedHours > 0) {
    out.push(
      `ORE STIMATE A BUDGET: ${p.estimatedHours}h ` +
        `(consumate al ${Math.round((logged / (p.estimatedHours * 60)) * 100)}%)`,
    );
  }

  // Niente ore mese per mese: il riassunto deve dire *cosa* si sta facendo, e
  // avere la serie temporale sotto il naso porta il modello a commentare
  // l'andamento invece del lavoro. Il grafico in pagina la mostra già meglio.
  if (activity && activity.bySubtype.length > 0) {
    out.push(
      "\nORE PER TIPO DI LAVORO:\n" +
        activity.bySubtype
          .map((s) => `- ${label(s.subtypeId)}: ${formatHours(s.minutes)}`)
          .join("\n"),
    );
  }

  if (entries.length > 0) {
    const rows = [...entries]
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((e) => {
        const title = redactNames(e.title.trim(), people) || "senza titolo";
        return `- ${e.startsAt.slice(0, 10)} · ${formatHours(workedMinutes(e, workHours))} · ${label(e.subtypeId)} · ${title}`;
      });
    out.push(`\nATTIVITÀ (${rows.length}):\n${rows.join("\n")}`);
  }

  return out.join("\n");
}
