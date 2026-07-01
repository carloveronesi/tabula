import type { Id, Project } from "@/data/types";

/** Campi del progetto modificabili dall'editor della vista Progetti. */
export type ProjectEditable = Pick<
  Project,
  | "name"
  | "clientId"
  | "status"
  | "description"
  | "objectives"
  | "estimatedHours"
  | "startDate"
  | "endDate"
  | "teamIds"
  | "contactIds"
  | "subtaskDefs"
  | "color"
>;

const sameIds = (a: Id[], b: Id[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

const sameSubtasks = (
  a: Project["subtaskDefs"],
  b: Project["subtaskDefs"],
): boolean =>
  a.length === b.length &&
  a.every((s, i) => s.id === b[i].id && s.label === b[i].label);

/** Vero se i campi modificabili di due progetti coincidono (per il "dirty"). Pura. */
export function projectEditableEqual(
  a: ProjectEditable,
  b: ProjectEditable,
): boolean {
  return (
    a.name === b.name &&
    a.clientId === b.clientId &&
    a.status === b.status &&
    a.description === b.description &&
    a.objectives === b.objectives &&
    a.estimatedHours === b.estimatedHours &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    a.color === b.color &&
    sameIds(a.teamIds, b.teamIds) &&
    sameIds(a.contactIds, b.contactIds) &&
    sameSubtasks(a.subtaskDefs, b.subtaskDefs)
  );
}

/** Campi minimi per creare un progetto; il resto prende default sani. */
export interface NewProjectInput {
  name: string;
  clientId: Id | null;
}

/**
 * Costruisce un nuovo Project con default sani. `id` iniettato per restare puro
 * e testabile. `kind` deriva dalla presenza del cliente.
 */
export function newProject(input: NewProjectInput, id: Id): Project {
  return {
    id,
    clientId: input.clientId,
    kind: input.clientId ? "client" : "internal",
    name: input.name.trim(),
    subtaskDefs: [],
    status: "active",
    description: "",
    objectives: "",
    startDate: "",
    endDate: "",
    teamIds: [],
    contactIds: [],
    estimatedHours: 0,
    color: null,
  };
}
