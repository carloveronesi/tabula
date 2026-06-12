import type { Client, Id, Person, Project, ProjectStatus } from "@/data/types";
import type { ParsedExport } from "@/data/import/parseExport";

/** Entità + indici per risolvere i riferimenti del formato in id opachi. */
export interface Inventory {
  clients: Client[];
  projects: Project[];
  people: Person[];
  clientIdByKey: Record<string, Id>; // clientKey → id
  projectIdBySourceId: Record<string, Id>; // "prj_…" → id
  personIdByName: Record<string, Id>; // nome → id
}

const VALID_STATUS: ProjectStatus[] = [
  "active",
  "completed",
  "paused",
  "archived",
];

function normalizeStatus(status: string | undefined): ProjectStatus {
  return status && (VALID_STATUS as string[]).includes(status)
    ? (status as ProjectStatus)
    : "active";
}

/**
 * Inventaria clienti/persone/progetti assegnando id opachi.
 * Ordine di creazione: clienti → persone → progetti (così i progetti
 * possono risolvere clientId e teamIds già indicizzati).
 * `makeId` è iniettabile per test deterministici.
 */
export function buildInventory(
  parsed: ParsedExport,
  makeId: () => Id,
  now: number = Date.now(),
): Inventory {
  const clients: Client[] = [];
  const clientIdByKey: Record<string, Id> = {};
  for (const [key, client] of Object.entries(parsed.clients ?? {})) {
    const id = makeId();
    clients.push({ id, name: client.name, color: null, createdAt: now });
    clientIdByKey[key] = id;
  }

  const people: Person[] = [];
  const personIdByName: Record<string, Id> = {};
  for (const person of parsed.people) {
    const id = makeId();
    people.push({ id, name: person.name });
    personIdByName[person.name] = id;
  }

  const projects: Project[] = [];
  const projectIdBySourceId: Record<string, Id> = {};
  for (const [sourceId, project] of Object.entries(parsed.projects ?? {})) {
    const id = makeId();
    const clientId = project.clientKey
      ? (clientIdByKey[project.clientKey] ?? null)
      : null;
    const teamIds = (project.team ?? [])
      .map((name) => personIdByName[name])
      .filter((personId): personId is Id => Boolean(personId));

    projects.push({
      id,
      clientId,
      kind: project.kind,
      name: project.name,
      subtaskDefs: [],
      status: normalizeStatus(project.status),
      description: project.description ?? "",
      objectives: project.objectives ?? "",
      startDate: project.startDate ?? "",
      endDate: project.endDate ?? "",
      teamIds,
      contactIds: [],
      estimatedHours: 0,
    });
    projectIdBySourceId[sourceId] = id;
  }

  return {
    clients,
    projects,
    people,
    clientIdByKey,
    projectIdBySourceId,
    personIdByName,
  };
}
