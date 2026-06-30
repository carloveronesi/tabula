import type { ProjectStatus } from "@/data/types";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "Attivo",
  completed: "Completato",
  paused: "In pausa",
  archived: "Archiviato",
};
export const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[];

// Colore della pastiglia di stato (decorativo, hex fissi: non sono ruoli del tema).
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "#10b981",
  completed: "#3b82f6",
  paused: "#f59e0b",
  archived: "#9aa1b2",
};

// ponytail: i progetti interni non hanno un cliente da cui ereditare il colore;
// ambra fissa per il loro gruppo, come nel mockup.
export const INTERNAL_COLOR = "#f59e0b";
