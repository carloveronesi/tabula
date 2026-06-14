import type { Id, Project } from "@/data/types";

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
  };
}
