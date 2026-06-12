import type { Id, ISODate, Todo } from "@/data/types";
import type { SourceTodo } from "@/data/import/sourceTypes";
import type { Inventory } from "@/data/import/buildInventory";

/**
 * Mappa i todo del formato di import sul modello, risolvendo `project`
 * (nome) in `projectId`. I subtask sono rinviati (forma sorgente non nota).
 */
export function mapTodos(source: SourceTodo[], inventory: Inventory): Todo[] {
  const projectIdByName: Record<string, Id> = {};
  for (const p of inventory.projects) projectIdByName[p.name] = p.id;

  return source.map((t) => ({
    id: t.id,
    title: t.title,
    projectId: t.project ? (projectIdByName[t.project] ?? null) : null,
    tags: t.tags ?? [],
    done: t.isDone,
    dueDate: (t.endDate ?? null) as ISODate | null,
    subtasks: [],
    createdAt: t.createdAt,
  }));
}
