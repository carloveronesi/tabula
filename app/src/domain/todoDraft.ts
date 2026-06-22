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

/**
 * Todo da mostrare nel widget della vista Giorno: solo i non completati,
 * ordinati per rilevanza — prima gli scaduti, poi in scadenza oggi, poi con
 * scadenza futura (per data crescente), infine senza scadenza (più recenti in
 * alto). `today` iniettato per restare puro.
 */
export function widgetTodos(todos: Todo[], today: ISODate): Todo[] {
  const rank = (t: Todo): number => {
    if (t.dueDate === null) return 3;
    if (t.dueDate < today) return 0;
    if (t.dueDate === today) return 1;
    return 2;
  };
  return todos
    .filter((t) => !t.done)
    .sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate < b.dueDate ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    });
}

/** Aggiunge un sottotask (titolo trimmato, non fatto). `id` iniettato. Puro. */
export function addSubtask(todo: Todo, title: string, id: Id): Todo {
  const trimmed = title.trim();
  if (trimmed === "") return todo;
  return {
    ...todo,
    subtasks: [...todo.subtasks, { id, title: trimmed, done: false }],
  };
}

/** Inverte lo stato `done` del sottotask indicato. Puro. */
export function toggleSubtask(todo: Todo, subId: Id): Todo {
  return {
    ...todo,
    subtasks: todo.subtasks.map((s) =>
      s.id === subId ? { ...s, done: !s.done } : s,
    ),
  };
}

/** Rimuove il sottotask indicato. Puro. */
export function removeSubtask(todo: Todo, subId: Id): Todo {
  return { ...todo, subtasks: todo.subtasks.filter((s) => s.id !== subId) };
}

/** Avanzamento dei sottotask: completati su totale. */
export function subtaskProgress(todo: Todo): { done: number; total: number } {
  return {
    done: todo.subtasks.filter((s) => s.done).length,
    total: todo.subtasks.length,
  };
}

/**
 * Aggiunge un tag (trimmato). Ignora i vuoti e i duplicati (confronto
 * case-insensitive). Puro.
 */
export function addTag(todo: Todo, tag: string): Todo {
  const trimmed = tag.trim();
  if (trimmed === "") return todo;
  const exists = todo.tags.some(
    (t) => t.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return todo;
  return { ...todo, tags: [...todo.tags, trimmed] };
}

/** Rimuove il tag indicato (confronto case-insensitive). Puro. */
export function removeTag(todo: Todo, tag: string): Todo {
  return {
    ...todo,
    tags: todo.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()),
  };
}
