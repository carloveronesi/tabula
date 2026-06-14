import type { Id, ISODate, Todo } from "@/data/types";

/** Campi minimi per creare un todo; il resto prende default sani. */
export interface NewTodoInput {
  title: string;
  projectId?: Id | null;
}

/**
 * Costruisce un nuovo Todo con default sani. `id`/`now` iniettati per restare
 * puro e testabile.
 */
export function newTodo(input: NewTodoInput, id: Id, now: number): Todo {
  return {
    id,
    title: input.title.trim(),
    projectId: input.projectId ?? null,
    tags: [],
    done: false,
    dueDate: null,
    subtasks: [],
    createdAt: now,
  };
}

/**
 * Ordina i todo per la lista: prima i non completati, poi i completati;
 * a parità, i più recenti (createdAt maggiore) in alto. Restituisce una copia.
 */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}

/**
 * Un todo è "scaduto" se ha una scadenza precedente a oggi e non è completato.
 * Confronto lessicografico tra date ISO (`YYYY-MM-DD`), equivalente a quello
 * cronologico. `today` iniettato per restare puro.
 */
export function isOverdue(todo: Todo, today: ISODate): boolean {
  return !todo.done && todo.dueDate !== null && todo.dueDate < today;
}
