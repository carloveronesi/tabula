import type { Client, Entry, Id, ISODate, Project } from "@/data/types";
import type { WorkHours } from "@/domain/slots";
import { workedMinutes } from "@/domain/time";

/**
 * Aggrega le entry di un periodo in righe per l'export Excel. Logica pura: chi
 * chiama passa le entry già filtrate sul mese. Le voci senza progetto diventano
 * pseudo-progetti (Ferie, Evento, Interno · <sottotipo>, o "(senza progetto)"
 * sotto il cliente). `daily` ha una riga per (giorno × progetto); `totals` una
 * riga per progetto sull'intero periodo.
 */
export interface ReportRow {
  date?: ISODate;
  client: string;
  project: string;
  minutes: number;
}

export interface ReportData {
  daily: ReportRow[];
  totals: ReportRow[];
  totalMinutes: number;
}

function labelFor(
  e: Entry,
  projectById: Map<Id, Project>,
  clientById: Map<Id, Client>,
  subtypeById: Map<Id, string>,
): { key: string; client: string; project: string } {
  const sub = e.subtypeId ? subtypeById.get(e.subtypeId) : undefined;
  const suffix = sub ? ` · ${sub}` : "";

  if (e.projectId) {
    const p = projectById.get(e.projectId);
    const client = p?.clientId ? clientById.get(p.clientId)?.name ?? "" : "";
    return { key: e.projectId, client, project: p?.name ?? "" };
  }
  switch (e.type) {
    case "client": {
      const client = e.clientId ? clientById.get(e.clientId)?.name ?? "" : "";
      return { key: `client:${e.clientId ?? ""}:${e.subtypeId ?? ""}`, client, project: "(senza progetto)" };
    }
    case "internal":
      return { key: `internal:${e.subtypeId ?? ""}`, client: "", project: `Interno${suffix}` };
    case "vacation":
      return { key: "vacation", client: "", project: "Ferie" };
    case "event":
      return { key: `event:${e.subtypeId ?? ""}`, client: "", project: `Evento${suffix}` };
  }
}

export function reportRows(
  entries: Entry[],
  projects: Project[],
  clients: Client[],
  subtypes: { id: Id; label: string }[],
  workHours: WorkHours,
): ReportData {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const subtypeById = new Map(subtypes.map((s) => [s.id, s.label]));

  const dailyMap = new Map<string, ReportRow>();
  const totalsMap = new Map<string, ReportRow>();
  let totalMinutes = 0;

  for (const e of entries) {
    const min = workedMinutes(e, workHours);
    if (min <= 0) continue;
    totalMinutes += min;
    const { key, client, project } = labelFor(e, projectById, clientById, subtypeById);
    const date = e.startsAt.slice(0, 10);

    const dKey = `${date}|${key}`;
    const d = dailyMap.get(dKey);
    if (d) d.minutes += min;
    else dailyMap.set(dKey, { date, client, project, minutes: min });

    const t = totalsMap.get(key);
    if (t) t.minutes += min;
    else totalsMap.set(key, { client, project, minutes: min });
  }

  const daily = [...dailyMap.values()].sort(
    (a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "") ||
      a.client.localeCompare(b.client) ||
      a.project.localeCompare(b.project),
  );
  const totals = [...totalsMap.values()].sort((a, b) => b.minutes - a.minutes);

  return { daily, totals, totalMinutes };
}
